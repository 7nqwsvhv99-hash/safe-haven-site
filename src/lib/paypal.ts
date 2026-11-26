import { ReservationError } from "@/lib/event-reservation-service";

function paypalBaseUrl() {
  return process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function paidEventRegistrationEnabled() {
  return process.env.SAFE_HAVEN_EVENT_PAYMENTS_ENABLED === "true" && paypalConfigured();
}

export async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ReservationError("Online payment is temporarily unavailable. Please contact Safe Haven for help.", 503);
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json();
  if (!response.ok || typeof body.access_token !== "string") throw new ReservationError("Online payment is temporarily unavailable. Please try again later.", 503);
  return body.access_token as string;
}

export async function paypalRequest<T>(path: string, accessToken: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ReservationError("We could not confirm the PayPal transaction. Please contact Safe Haven before trying again.", 503);
  return body as T;
}

export async function createPayPalOrder(input: {
  requestKey: string; confirmationNumber: string; eventName: string;
  lines: Array<{ name: string; quantity: number; price: number }>;
  total: number; returnUrl: string; cancelUrl: string;
}) {
  const accessToken = await paypalAccessToken();
  const idempotencyToken = input.requestKey.replace(/-/g, "").slice(0, 36);
  const result = await paypalRequest<{ id?: string; links?: Array<{ href?: string; rel?: string }> }>("/v2/checkout/orders", accessToken, {
    method: "POST",
    headers: { "PayPal-Request-Id": idempotencyToken },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.confirmationNumber,
        custom_id: input.confirmationNumber,
        description: input.eventName.slice(0, 127),
        amount: {
          currency_code: "USD",
          value: input.total.toFixed(2),
          breakdown: { item_total: { currency_code: "USD", value: input.total.toFixed(2) } },
        },
        items: input.lines.map((line) => ({
          name: line.name.slice(0, 127),
          quantity: String(line.quantity),
          unit_amount: { currency_code: "USD", value: line.price.toFixed(2) },
          category: "DIGITAL_GOODS",
        })),
      }],
      application_context: { brand_name: "Safe Haven Humane Society", user_action: "PAY_NOW", return_url: input.returnUrl, cancel_url: input.cancelUrl },
    }),
  });
  const approvalUrl = result.links?.find((link) => link.rel === "approve")?.href;
  if (!result.id || !approvalUrl) throw new ReservationError("PayPal did not return a checkout link. Please try again.", 503);
  return { orderId: result.id, approvalUrl };
}

export async function getPayPalOrder(orderId: string) {
  const accessToken = await paypalAccessToken();
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, accessToken, { method: "GET" });
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await paypalAccessToken();
  const current = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, accessToken, { method: "GET" });
  if (current.status === "COMPLETED") return current;
  if (current.status !== "APPROVED") throw new ReservationError("PayPal has not confirmed this payment yet.", 409);
  try {
    return await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, accessToken, { method: "POST", body: "{}" });
  } catch {
    // A webhook and the buyer return can arrive at nearly the same time. Read the order again;
    // a completed capture is safe to accept because PayPal is the payment source of truth.
    const latest = await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, accessToken, { method: "GET" });
    if (latest.status === "COMPLETED") return latest;
    throw new ReservationError("PayPal has not confirmed this payment yet.", 409);
  }
}

export async function verifyPayPalWebhook(headers: Headers, event: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) throw new ReservationError("Payment verification is not configured.", 503);
  const accessToken = await paypalAccessToken();
  const transmission = Object.fromEntries([
    ["auth_algo", headers.get("paypal-auth-algo")],
    ["cert_url", headers.get("paypal-cert-url")],
    ["transmission_id", headers.get("paypal-transmission-id")],
    ["transmission_sig", headers.get("paypal-transmission-sig")],
    ["transmission_time", headers.get("paypal-transmission-time")],
    ["webhook_id", webhookId],
    ["webhook_event", event],
  ]);
  if (Object.values(transmission).some((value) => !value)) return false;
  const result = await paypalRequest<{ verification_status?: string }>("/v1/notifications/verify-webhook-signature", accessToken, { method: "POST", body: JSON.stringify(transmission) });
  return result.verification_status === "SUCCESS";
}

export type PayPalOrder = {
  id?: string; status?: string; links?: Array<{ href?: string; rel?: string }>; purchase_units?: Array<{
    custom_id?: string; reference_id?: string;
    amount?: { currency_code?: string; value?: string };
    payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> };
  }>;
};
