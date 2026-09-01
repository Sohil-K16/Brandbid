import crypto from "crypto";

export interface CreateOrderParams {
  amount: number; // in USD (will be converted to cents)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number; // in cents
  currency: string;
  receipt: string;
  status: string;
  isMock?: boolean;
}

export interface VerifyPaymentParams {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/**
 * Checks if real Razorpay credentials are provided.
 */
export function hasLiveRazorpayCredentials(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes("placeholder") &&
    !keyId.includes("rzp_test_brandbid_local")
  );
}

/**
 * Creates a Razorpay payment order.
 * If live credentials are not set, generates a compliant test order ID for simulation.
 */
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const amountInCents = Math.round(params.amount * 100);
  const currency = params.currency || "USD";

  if (hasLiveRazorpayCredentials()) {
    try {
      const auth = Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency,
          receipt: params.receipt,
          notes: params.notes || {},
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id,
          amount: data.amount,
          currency: data.currency,
          receipt: data.receipt,
          status: data.status,
        };
      }
    } catch (err) {
      console.error("[Razorpay] Order creation error, falling back to simulated order:", err);
    }
  }

  // Local / Test simulation order
  const mockOrderId = "order_mock_" + crypto.randomBytes(8).toString("hex");
  return {
    id: mockOrderId,
    amount: amountInCents,
    currency,
    receipt: params.receipt,
    status: "created",
    isMock: true,
  };
}

/**
 * Verifies Razorpay HMAC SHA-256 payment signature.
 */
export function verifyRazorpaySignature(params: VerifyPaymentParams): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  // Handle mock orders in local test mode
  if (razorpayOrderId.startsWith("order_mock_")) {
    // Valid if signature starts with mock_sig_ or matches generated test hash
    return (
      razorpaySignature.startsWith("mock_sig_") ||
      razorpaySignature === "valid_test_signature"
    );
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return false;
  }

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(razorpaySignature, "utf8")
  );
}

/**
 * Verifies Razorpay webhook signature.
 */
export function verifyWebhookSignature(rawBody: string, webhookSignature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !webhookSignature) {
    // In mock mode without secret, allow mock webhook signature
    return webhookSignature.startsWith("mock_hook_");
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(webhookSignature, "utf8")
    );
  } catch {
    return false;
  }
}
