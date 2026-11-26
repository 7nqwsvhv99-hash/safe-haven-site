import { NextResponse } from "next/server";
import {
  airtableCreate, airtableGet, capacityForOption, eventIsEligible, findByRequestKey,
  newConfirmationNumber, readText, reservationTables, ReservationError, validateReservationInput,
} from "@/lib/event-reservation-service";
import { createPayPalOrder, getPayPalOrder, paidEventRegistrationEnabled } from "@/lib/paypal";
import { markEventCapacitySaved, releaseEventCapacity, reserveEventCapacity } from "@/lib/event-capacity";

function chicagoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function eligibleForSale(fields: Record<string, unknown>) {
  if (fields.Active !== true) return false;
  const today = chicagoToday();
  const start = readText(fields["Sales Start"]), end = readText(fields["Sales End"]);
  return (!start || start <= today) && (!end || end >= today);
}

export async function POST(request: Request) {
  let heldRequestKey = "";
  let capacityReserved = false;
  try {
    const input = validateReservationInput(await request.json());
    heldRequestKey = input.requestKey;
    const prior = await findByRequestKey(input.requestKey);
    if (prior.length) {
      const confirmationNumber = readText(prior[0].fields["Confirmation Number"]);
      const orderId = readText(prior[0].fields["PayPal Order ID"]);
      if (readText(prior[0].fields["Registration Type"]) === "Free RSVP") return NextResponse.json({ free: true, confirmationNumber });
      if (!paidEventRegistrationEnabled()) throw new ReservationError("Paid event registration is not currently available.", 503);
      if (orderId) {
        const order = await getPayPalOrder(orderId);
        const approvalUrl = order.links?.find((link) => link.rel === "approve")?.href;
        if (approvalUrl) return NextResponse.json({ approvalUrl, confirmationNumber });
        if (order.status === "COMPLETED") return NextResponse.json({ confirmationNumber, returnUrl: `/events/reservation-complete?confirmation=${encodeURIComponent(confirmationNumber)}&token=${encodeURIComponent(orderId)}` });
      }
      throw new ReservationError("This reservation was already submitted. Contact Safe Haven if you need help.", 409);
    }

    const event = await airtableGet(reservationTables.events, input.eventId);
    if (!eventIsEligible(event)) throw new ReservationError("This event is no longer accepting reservations.", 409);
    const visitorAction = readText(event.fields["Visitor Action"]);
    if (!["RSVP for free", "Purchase tickets", "Register and pay"].includes(visitorAction)) throw new ReservationError("This event is not configured to accept online registrations.", 409);
    if (["Purchase tickets", "Register and pay"].includes(visitorAction) && !paidEventRegistrationEnabled()) throw new ReservationError("Paid event registration is not currently available.", 503);
    const capacityBaselineAt = Date.now();

    const selected = await Promise.all(input.lines.map(async (line) => {
      const option = await airtableGet(reservationTables.options, line.optionId);
      const fields = option.fields;
      if (!Array.isArray(fields.Event) || !(fields.Event as string[]).includes(input.eventId) || !eligibleForSale(fields)) throw new ReservationError("One of your selected options is no longer available.", 409);
      const price = typeof fields.Price === "number" && Number.isFinite(fields.Price) ? fields.Price : -1;
      if (price < 0) throw new ReservationError("A selected option is not configured correctly. Please contact Safe Haven.", 409);
      const capacity = typeof fields["Capacity Units"] === "number" ? fields["Capacity Units"] : 0;
      if (visitorAction === "RSVP for free" && price !== 0) throw new ReservationError("This event is only accepting free RSVPs.", 409);
      if (["Purchase tickets", "Register and pay"].includes(visitorAction) && price === 0) throw new ReservationError("A selected option does not match this event’s payment setup.", 409);
      const used = capacity > 0 ? await capacityForOption(line.optionId) : 0;
      return { ...line, optionId: line.optionId, name: readText(fields["Option Name"]) || "Event registration", price, capacity, used };
    }));

    const capacityRequests = selected.map((line) => ({ optionId: line.optionId, quantity: line.quantity, capacity: line.capacity, used: line.used, baselineAt: capacityBaselineAt }));
    await reserveEventCapacity(input.requestKey, capacityRequests);
    capacityReserved = capacityRequests.some((item) => item.capacity > 0);

    const total = Number(selected.reduce((sum, line) => sum + line.price * line.quantity, 0).toFixed(2));
    if (!Number.isFinite(total) || total < 0 || total > 100_000) throw new ReservationError("The registration total is invalid. Please contact Safe Haven.", 409);
    const free = total === 0;
    const confirmationNumber = newConfirmationNumber();
    const now = new Date().toISOString();
    let orderId = "";
    let approvalUrl = "";

    if (!free) {
      const origin = new URL(request.url).origin;
      const order = await createPayPalOrder({
        requestKey: input.requestKey,
        confirmationNumber,
        eventName: readText(event.fields["Event Name"]) || "Safe Haven Event",
        lines: selected.map((line) => ({ name: line.name, quantity: line.quantity, price: line.price })),
        total,
        returnUrl: `${origin}/events/reservation-complete?confirmation=${encodeURIComponent(confirmationNumber)}&token={CHECKOUT.ORDER_ID}`,
        cancelUrl: `${origin}/events/${encodeURIComponent(input.eventId)}?payment=cancelled`,
      });
      orderId = order.orderId;
      approvalUrl = order.approvalUrl;
    }

    const records = await airtableCreate(reservationTables.reservations, selected.map((line) => ({ fields: {
      "Reservation Name": `${confirmationNumber} · ${input.lastName}`,
      Event: [input.eventId], "Ticket / Package Option": [line.optionId], Quantity: line.quantity,
      "Purchaser First Name": input.firstName, "Purchaser Last Name": input.lastName,
      "Purchaser Email": input.email, "Purchaser Phone": input.phone,
      "Guest Names": input.guestNames, "Special Requests": input.specialRequests,
      "Amount Due": Number((line.price * line.quantity).toFixed(2)), "Amount Paid": 0,
      ...(free ? {} : { "Payment Status": "Pending Payment", "Payment Method": "PayPal", "PayPal Order ID": orderId }),
      "Registration Type": free ? "Free RSVP" : "Paid",
      "Reservation Status": free ? "Confirmed" : "Pending",
      "Confirmation Number": confirmationNumber, "Idempotency Key": input.requestKey,
      "Submitted At": now,
      ...(free ? { "Confirmed At": now } : {}),
    } })));

    if (!records.length) throw new ReservationError("We could not save the reservation. Please try again.", 503);
    if (capacityReserved) await markEventCapacitySaved(input.requestKey);
    return NextResponse.json(free ? { free: true, confirmationNumber } : { approvalUrl, confirmationNumber });
  } catch (error) {
    if (heldRequestKey && capacityReserved) {
      try { await releaseEventCapacity(heldRequestKey); } catch (releaseError) { console.error("Could not release event capacity hold", releaseError); }
    }
    const status = error instanceof ReservationError ? error.status : 500;
    if (!(error instanceof ReservationError)) console.error("Event reservation error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "We could not create your reservation right now. Please try again." }, { status });
  }
}
