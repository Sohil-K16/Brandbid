import DodoPayments from "dodopayments";
import crypto from "crypto";

export interface CreateDodoCheckoutParams {
  amount: number; // in USD (will be passed or converted to cents)
  brandId: string;
  brandName: string;
  customerEmail?: string;
  customerName?: string;
  isRebid?: boolean;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

export interface DodoCheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  isMock?: boolean;
  clientSecret?: string | null;
  paymentId?: string | null;
}

interface MockDodoSession {
  sessionId: string;
  paymentId: string;
  checkoutUrl: string;
  amount: number;
  amountInCents: number;
  currency: string;
  metadata: Record<string, string>;
  payment_status: "succeeded";
  status: "completed";
}

export interface VerifyDodoWebhookParams {
  rawBody: string;
  headers: {
    "webhook-id"?: string | null;
    "webhook-signature"?: string | null;
    "webhook-timestamp"?: string | null;
    [key: string]: string | string[] | null | undefined;
  };
}

const DODO_SUCCESS_PATH = "/checkout/success";
const mockDodoSessions = new Map<string, MockDodoSession>();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("placeholder") ||
    normalized.includes("your_") ||
    normalized.includes("example") ||
    normalized.includes("changeme")
  );
}

function getEnvStrict(name: string): string {
  const value = process.env[name];
  if (!value || isPlaceholder(value)) {
    throw new Error(`Missing required Dodo configuration: ${name}`);
  }
  return value;
}

function getAppUrlStrict(): string {
  const appUrl = getEnvStrict("NEXT_PUBLIC_APP_URL");
  let parsed: URL;
  try {
    parsed = new URL(appUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL");
  }

  if (isProduction() && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL must use https in production");
  }

  return parsed.origin;
}

export function canUseMockDodoPayments(): boolean {
  return !isProduction();
}

/**
 * Checks if live/valid Dodo Payments credentials are provided.
 */
export function hasLiveDodoCredentials(): boolean {
  return !isPlaceholder(process.env.DODO_PAYMENTS_API_KEY);
}

export function assertDodoCheckoutConfig(): void {
  if (!isProduction()) return;

  const environment = getEnvStrict("DODO_PAYMENTS_ENVIRONMENT");
  if (environment !== "live_mode") {
    throw new Error("DODO_PAYMENTS_ENVIRONMENT must be live_mode in production");
  }

  getEnvStrict("DODO_PAYMENTS_API_KEY");
  getEnvStrict("DODO_PAYMENTS_PRODUCT_ID");
  getAppUrlStrict();
}

export function assertDodoWebhookConfig(): void {
  if (!isProduction()) return;

  getEnvStrict("DODO_PAYMENTS_API_KEY");
  getEnvStrict("DODO_PAYMENTS_WEBHOOK_KEY");
  const environment = getEnvStrict("DODO_PAYMENTS_ENVIRONMENT");
  if (environment !== "live_mode") {
    throw new Error("DODO_PAYMENTS_ENVIRONMENT must be live_mode in production");
  }
}

/**
 * Instantiates the official DodoPayments client.
 */
export function getDodoClient(): DodoPayments {
  const environment = process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";

  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || "",
    environment,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_PAYMENTS_WEBHOOK_SECRET,
  });
}

/**
 * Creates a Dodo Payments Checkout Session.
 * Automatically handles live API requests or falls back to seamless test simulation.
 */
export async function createDodoCheckoutSession(
  params: CreateDodoCheckoutParams
): Promise<DodoCheckoutSessionResult> {
  assertDodoCheckoutConfig();

  const appOrigin = (() => {
    if (params.returnUrl) {
      return new URL(params.returnUrl).origin;
    }
    if (canUseMockDodoPayments()) {
      return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    }
    return getAppUrlStrict();
  })();
  const returnUrl = params.returnUrl || `${appOrigin}${DODO_SUCCESS_PATH}`;
  const amountInCents = Math.round(params.amount * 100);
  const metadata = {
    brandId: params.brandId,
    brandName: params.brandName,
    isRebid: String(Boolean(params.isRebid)),
    paymentType: params.isRebid ? "rebid" : "claim",
    amount: String(params.amount),
    amountInCents: String(amountInCents),
    ...(params.metadata || {}),
  };

  if (hasLiveDodoCredentials()) {
    const client = getDodoClient();

    const session = await client.checkoutSessions.create({
      product_cart: [
        {
          product_id: isProduction() ? getEnvStrict("DODO_PAYMENTS_PRODUCT_ID") : process.env.DODO_PAYMENTS_PRODUCT_ID || "pdt_brandbid_spot",
          quantity: 1,
          amount: amountInCents,
        },
      ],
      customer: {
        email: params.customerEmail || "bidder@brandbid.me",
        name: params.customerName || params.brandName,
      },
      metadata,
      return_url: returnUrl,
    });

    if (!session?.session_id) {
      throw new Error("Dodo checkout session was not created");
    }

    return {
      sessionId: session.session_id,
      checkoutUrl: session.checkout_url || `${returnUrl}?session_id=${session.session_id}&status=success`,
      amount: params.amount,
      currency: "USD",
      clientSecret: session.client_secret || null,
      paymentId: session.payment_id || null,
      isMock: false,
    };
  }

  if (!canUseMockDodoPayments()) {
    throw new Error("Dodo live credentials are required in production");
  }

  const mockSessionId = "cks_mock_" + crypto.randomBytes(8).toString("hex");
  const mockPaymentId = "pay_mock_" + crypto.randomBytes(8).toString("hex");
  const mockCheckoutUrl = `${returnUrl}?session_id=${mockSessionId}&status=success`;
  mockDodoSessions.set(mockSessionId, {
    sessionId: mockSessionId,
    paymentId: mockPaymentId,
    checkoutUrl: mockCheckoutUrl,
    amount: params.amount,
    amountInCents,
    currency: "USD",
    metadata,
    payment_status: "succeeded",
    status: "completed",
  });

  return {
    sessionId: mockSessionId,
    checkoutUrl: mockCheckoutUrl,
    amount: params.amount,
    currency: "USD",
    isMock: true,
  };
}

/**
 * Retrieves Dodo checkout session status.
 */
export async function retrieveDodoCheckoutSession(sessionId: string) {
  if (!sessionId) return null;

  if (sessionId.startsWith("cks_mock_")) {
    const mockSession = mockDodoSessions.get(sessionId);
    if (!mockSession) return null;
    return {
      id: mockSession.sessionId,
      session_id: mockSession.sessionId,
      payment_id: mockSession.paymentId,
      checkout_url: mockSession.checkoutUrl,
      payment_status: mockSession.payment_status,
      status: mockSession.status,
      metadata: mockSession.metadata,
      total_amount: mockSession.amountInCents,
      amount: mockSession.amountInCents,
      currency: mockSession.currency,
      isMock: true,
    };
  }

  if (hasLiveDodoCredentials()) {
    try {
      const client = getDodoClient();
      return await client.checkoutSessions.retrieve(sessionId);
    } catch (error) {
      console.error("[Dodo Payments] Error retrieving session:", error);
      return null;
    }
  }

  return null;
}

/**
 * Verifies a Dodo Payments Webhook request with raw bytes and standard webhook headers.
 */
export function verifyDodoWebhook(params: VerifyDodoWebhookParams): {
  isValid: boolean;
  event: any | null;
} {
  const { rawBody, headers } = params;
  const webhookId = (headers["webhook-id"] || headers["Webhook-Id"]) as string;
  const webhookSignature = (headers["webhook-signature"] || headers["Webhook-Signature"]) as string;
  const webhookTimestamp = (headers["webhook-timestamp"] || headers["Webhook-Timestamp"]) as string;

  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY || process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

  if (isProduction()) {
    try {
      assertDodoWebhookConfig();
    } catch {
      return { isValid: false, event: null };
    }
  }

  // 1. Support simulated test signatures in development / testing
  if (
    canUseMockDodoPayments() &&
    webhookSignature &&
    (webhookSignature.startsWith("mock_hook_") ||
      webhookSignature.startsWith("mock_sig_") ||
      webhookSignature === "valid_test_signature")
  ) {
    try {
      const parsed = JSON.parse(rawBody);
      return { isValid: true, event: parsed };
    } catch {
      return { isValid: false, event: null };
    }
  }

  if (canUseMockDodoPayments() && (!webhookKey || isPlaceholder(webhookKey))) {
    // If webhook secret is not configured in local development, parse safely
    try {
      const parsed = JSON.parse(rawBody);
      return { isValid: true, event: parsed };
    } catch {
      return { isValid: false, event: null };
    }
  }

  // 2. Official DodoPayments SDK unwrap verification
  try {
    if (!webhookKey) {
      return { isValid: false, event: null };
    }
    const client = getDodoClient();
    const event = client.webhooks.unwrap(rawBody, {
      headers: {
        "webhook-id": webhookId || "",
        "webhook-signature": webhookSignature || "",
        "webhook-timestamp": webhookTimestamp || "",
      },
      key: webhookKey,
    });

    return { isValid: true, event };
  } catch {
    if (!canUseMockDodoPayments()) {
      return { isValid: false, event: null };
    }

    // 3. Fallback standard HMAC-SHA256 verification (webhook-id.webhook-timestamp.rawBody)
    try {
      if (webhookId && webhookTimestamp && webhookSignature && webhookKey) {
        const secret = webhookKey.startsWith("whsec_")
          ? Buffer.from(webhookKey.replace("whsec_", ""), "base64")
          : Buffer.from(webhookKey, "utf8");

        const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`;
        const computedSignature = crypto
          .createHmac("sha256", secret)
          .update(toSign)
          .digest("base64");

        const cleanExpected = `v1,${computedSignature}`;
        if (
          webhookSignature.includes(computedSignature) ||
          webhookSignature === cleanExpected
        ) {
          const parsed = JSON.parse(rawBody);
          return { isValid: true, event: parsed };
        }
      }
    } catch {
      return { isValid: false, event: null };
    }

    return { isValid: false, event: null };
  }
}
