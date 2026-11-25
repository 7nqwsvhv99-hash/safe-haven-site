import { NextResponse } from "next/server";
import { ReservationError } from "@/lib/event-reservation-service";
import { reconcilePayPalOrder } from "@/lib/paypal-reconciliation";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { orderId?: unknown; confirmationNumber?: unknown };
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const confirmationNumber = typeof body.confirmationNumber === "string" ? body.confirmationNumber.trim() : "";
    if (!orderId || !confirmationNumber) throw new ReservationError("The payment return is missing its reservation details.", 400);
    return NextResponse.json(await reconcilePayPalOrder(orderId, confirmationNumber));
  } catch (error) {
    const status = error instanceof ReservationError ? error.status : 500;
    if (!(error instanceof ReservationError)) console.error("PayPal event capture error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "We could not verify this payment." }, { status });
  }
}
