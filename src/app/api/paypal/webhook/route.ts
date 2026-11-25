import { NextResponse } from "next/server";
import { ReservationError } from "@/lib/event-reservation-service";
import { reconcilePayPalOrder } from "@/lib/paypal-reconciliation";
import { verifyPayPalWebhook } from "@/lib/paypal";

export async function POST(request: Request) {
  try {
    const event = await request.json() as {
      id?: string; event_type?: string;
      resource?: { supplementary_data?: { related_ids?: { order_id?: string } } };
    };
    if (!await verifyPayPalWebhook(request.headers, event)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      if (!orderId) return NextResponse.json({ error: "Payment order ID was missing." }, { status: 400 });
      await reconcilePayPalOrder(orderId);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    const status = error instanceof ReservationError ? error.status : 500;
    if (!(error instanceof ReservationError)) console.error("PayPal webhook error", error);
    return NextResponse.json({ error: "We could not process this payment notification." }, { status });
  }
}
