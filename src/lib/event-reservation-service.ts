import { randomUUID } from "node:crypto";
import { eventEndTimestamp } from "@/lib/event-dates";
import { getSafeHavenAirtableConfig } from "@/lib/airtable-config";

const airtableConfig = () => getSafeHavenAirtableConfig();
const reservationTable = () => airtableConfig().tables.eventReservations;
const MAX_LINE_ITEMS = 10;
const MAX_QUANTITY = 20;
const HOLD_MINUTES = 360;

export type AirtableRecord = { id: string; fields: Record<string, unknown> };
export type ReservationLine = { optionId: string; quantity: number };

export class ReservationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function readText(value: unknown) { return typeof value === "string" ? value : ""; }
function linkedIds(value: unknown) { return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; }

export function validateReservationInput(value: unknown): { eventId: string; requestKey: string; lines: ReservationLine[]; firstName: string; lastName: string; email: string; phone: string; guestNames: string; specialRequests: string } {
  if (!value || typeof value !== "object") throw new ReservationError("Please review the reservation details and try again.");
  const body = value as Record<string, unknown>;
  const eventId = readText(body.eventId).trim();
  const requestKey = readText(body.requestKey).trim();
  const firstName = readText(body.firstName).trim().slice(0, 100);
  const lastName = readText(body.lastName).trim().slice(0, 100);
  const email = readText(body.email).trim().slice(0, 254);
  const phone = readText(body.phone).trim().slice(0, 40);
  const guestNames = readText(body.guestNames).trim().slice(0, 4000);
  const specialRequests = readText(body.specialRequests).trim().slice(0, 2000);
  if (!/^rec[a-zA-Z0-9]{14}$/.test(eventId) || !/^[a-f0-9-]{36}$/i.test(requestKey)) throw new ReservationError("Please refresh the event page and try again.");
  if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ReservationError("Enter your name and a valid email address.");
  if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > MAX_LINE_ITEMS) throw new ReservationError("Choose at least one available ticket or package.");
  const seen = new Set<string>();
  const lines = body.lines.map((item) => {
    if (!item || typeof item !== "object") throw new ReservationError("One of the selected options is invalid.");
    const row = item as Record<string, unknown>;
    const optionId = readText(row.optionId).trim();
    const quantity = row.quantity;
    if (!/^rec[a-zA-Z0-9]{14}$/.test(optionId) || seen.has(optionId)) throw new ReservationError("One of the selected options is invalid.");
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new ReservationError("Each quantity must be a whole number between 1 and 20.");
    seen.add(optionId);
    return { optionId, quantity };
  });
  return { eventId, requestKey, lines, firstName, lastName, email, phone, guestNames, specialRequests };
}

function token() {
  const value = process.env.AIRTABLE_ACCESS_TOKEN;
  if (!value) throw new ReservationError("Event registration is temporarily unavailable.", 503);
  return value;
}

export async function airtableList(table: string, fields: string[], formula?: string): Promise<AirtableRecord[]> {
  const params = new URLSearchParams({ pageSize: "100" });
  for (const field of fields) params.append("fields[]", field);
  if (formula) params.set("filterByFormula", formula);
  const rows: AirtableRecord[] = [];
  let offset = "";
  do {
    if (offset) params.set("offset", offset);
    const response = await fetch(`https://api.airtable.com/v0/${airtableConfig().baseId}/${table}?${params}`, { headers: { Authorization: `Bearer ${token()}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new ReservationError("We could not check availability right now. Please try again.", 503);
    rows.push(...(Array.isArray(data.records) ? data.records : []));
    offset = typeof data.offset === "string" ? data.offset : "";
  } while (offset);
  return rows;
}

export async function airtableGet(table: string, id: string): Promise<AirtableRecord> {
  const response = await fetch(`https://api.airtable.com/v0/${airtableConfig().baseId}/${table}/${id}`, { headers: { Authorization: `Bearer ${token()}` }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new ReservationError("That event or ticket is no longer available.", 409);
  return data as AirtableRecord;
}

export async function airtableCreate(table: string, records: Array<{ fields: Record<string, unknown> }>): Promise<AirtableRecord[]> {
  const response = await fetch(`https://api.airtable.com/v0/${airtableConfig().baseId}/${table}`, {
    method: "POST", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records, typecast: true }), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new ReservationError("We could not save the reservation right now. Please try again.", 503);
  return Array.isArray(data.records) ? data.records : [];
}

export async function airtableUpdateRecords(records: Array<{ id: string; fields: Record<string, unknown> }>) {
  const response = await fetch(`https://api.airtable.com/v0/${airtableConfig().baseId}/${reservationTable()}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records, typecast: true }), cache: "no-store",
  });
  if (!response.ok) throw new ReservationError("Payment was verified, but the reservation update needs staff review.", 503);
}

export async function findByRequestKey(requestKey: string) {
  const safe = requestKey.replace(/'/g, "\\'");
  return airtableList(reservationTable(), ["Confirmation Number", "PayPal Order ID", "Registration Type", "Reservation Status", "Amount Due", "Idempotency Key"], `{Idempotency Key}='${safe}'`);
}

export async function findByOrderId(orderId: string) {
  const safe = orderId.replace(/'/g, "\\'");
  return airtableList(reservationTable(), ["Confirmation Number", "PayPal Order ID", "Payment Status", "Reservation Status", "Amount Due", "Amount Paid", "Submitted At", "Ticket / Package Option"], `{PayPal Order ID}='${safe}'`);
}

export async function capacityForOption(optionId: string) {
  const reservations = await airtableList(reservationTable(), ["Ticket / Package Option", "Quantity", "Reservation Status", "Payment Status", "Submitted At"]);
  const now = Date.now();
  return reservations.filter((record) => {
    const linked = linkedIds(record.fields["Ticket / Package Option"]).includes(optionId);
    if (!linked || ["Cancelled", "Waitlisted"].includes(readText(record.fields["Reservation Status"]))) return false;
    const status = readText(record.fields["Reservation Status"]);
    if (status === "Confirmed" || readText(record.fields["Payment Status"]) === "Paid") return true;
    const submittedAt = Date.parse(readText(record.fields["Submitted At"]));
    return status === "Pending" && Number.isFinite(submittedAt) && submittedAt > now - HOLD_MINUTES * 60_000;
  }).reduce((sum, record) => sum + (typeof record.fields.Quantity === "number" ? record.fields.Quantity : 0), 0);
}

export function newConfirmationNumber() { return `SH-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`; }
export function eventIsEligible(event: AirtableRecord) {
  if (event.fields["Publish on Website"] !== true || readText(event.fields["Event Status"]) !== "Published") return false;
  const end = eventEndTimestamp(event.fields);
  return Number.isFinite(end) && end >= Date.now();
}

export const reservationTables = new Proxy({} as { events: string; options: string; reservations: string }, { get: (_target,key) => {
  const config=airtableConfig();
  const tableKey=key==="events"?"events":key==="options"?"eventTicketOptions":key==="reservations"?"eventReservations":"";
  return tableKey?config.tables[tableKey]:undefined;
} });
export const reservationLimits = { maxLines: MAX_LINE_ITEMS, maxQuantity: MAX_QUANTITY };
export { linkedIds, readText };
