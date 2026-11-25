import { airtableUpdateRecords, findByOrderId, readText, ReservationError } from "@/lib/event-reservation-service";
import { capturePayPalOrder, type PayPalOrder } from "@/lib/paypal";

export async function reconcilePayPalOrder(orderId: string, expectedConfirmation?: string) {
  if (!/^\w{10,64}$/.test(orderId)) throw new ReservationError("The PayPal order could not be verified.", 400);
  const reservations = await findByOrderId(orderId);
  if (!reservations.length) throw new ReservationError("We could not match this payment to a reservation. Please contact Safe Haven.", 404);
  const confirmation = readText(reservations[0].fields["Confirmation Number"]);
  if (!confirmation || reservations.some((record) => readText(record.fields["Confirmation Number"]) !== confirmation) || (expectedConfirmation && expectedConfirmation !== confirmation)) {
    throw new ReservationError("The payment does not match this reservation.", 409);
  }

  const order: PayPalOrder = await capturePayPalOrder(orderId);
  if (order.id !== orderId || order.status !== "COMPLETED") throw new ReservationError("PayPal has not confirmed this payment yet.", 409);
  const units = order.purchase_units || [];
  const unit = units.find((item) => item.custom_id === confirmation || item.reference_id === confirmation);
  const capture = unit?.payments?.captures?.find((item) => item.status === "COMPLETED");
  if (!unit || !capture?.id || capture.amount?.currency_code !== "USD") throw new ReservationError("PayPal has not confirmed this payment yet.", 409);

  const expectedAmount = Number(reservations.reduce((sum, record) => sum + (typeof record.fields["Amount Due"] === "number" ? record.fields["Amount Due"] : 0), 0).toFixed(2));
  const paidAmount = Number(capture.amount.value);
  if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) throw new ReservationError("The verified payment total does not match this reservation. Safe Haven staff must review it.", 409);

  if (!reservations.every((record) => readText(record.fields["Payment Status"]) === "Paid" && readText(record.fields["Reservation Status"]) === "Confirmed")) {
    const now = new Date().toISOString();
    await airtableUpdateRecords(reservations.map((record) => ({ id: record.id, fields: {
      "Payment Status": "Paid", "Payment Reference": capture.id,
      "Amount Paid": typeof record.fields["Amount Due"] === "number" ? record.fields["Amount Due"] : 0,
      "Reservation Status": "Confirmed", "Confirmed At": now,
    } })));
  }
  return { confirmationNumber: confirmation, status: "Confirmed", total: expectedAmount };
}
