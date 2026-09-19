import DodoPayments from "dodopayments";
import crypto from "crypto";
import { CreateDodoCheckoutParams, DodoCheckoutSessionResult } from "./types";
import { dodoEnvironment, getDodoWebhookKey } from "../dodo-env";

export * from "./types";

/**
 * Instantiates the official DodoPayments client.
 * Throws a real error if API key is not configured.
 */
export function getDodoClient(): DodoPayments {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "Dodo Payments is not configured: DODO_PAYMENTS_API_KEY is missing. Please set your Dodo Payments API key in environment variables."
    );
  }

  return new DodoPayments({
    bearerToken: apiKey,
    environment: dodoEnvironment,
    webhookKey: getDodoWebhookKey(),
  });
}

/**
 * Creates a real Dodo Payments Checkout Session using the official SDK.
 * Passes brandId, brandName, paymentAttemptId, isRebid, and amount in metadata.
 * Throws an error if configuration is missing or Dodo API call fails.
 */
export async function createDodoCheckoutSession(
  params: CreateDodoCheckoutParams
): Promise<DodoCheckoutSessionResult> {
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID;
  if (!productId || productId.trim() === "") {
    throw new Error(
      "Dodo Payments product is not configured: DODO_PAYMENTS_PRODUCT_ID is missing. Please configure a valid Dodo product ID."
    );
  }

  if (typeof params.amount !== "number" || isNaN(params.amount) || params.amount <= 0) {
    throw new Error(`Invalid bid amount: ${params.amount}. Amount must be a positive number.`);
  }

  // Dodo requires amount in cents (lowest currency denomination for USD)
  const amountInCents = Math.round(params.amount * 100);

  // Generate a unique internal paymentAttemptId for every payment attempt
  const paymentAttemptId =
    params.paymentAttemptId || "att_" + crypto.randomBytes(12).toString("hex");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnUrl =
    params.returnUrl ||
    process.env.DODO_PAYMENTS_RETURN_URL ||
    `${appUrl}/checkout/success?brand_id=${encodeURIComponent(params.brandId)}`;

  const client = getDodoClient();

  const session = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: productId,
        quantity: 1,
        amount: amountInCents,
      },
    ],
    customer: {
      email: params.customerEmail || "bidder@brandbid.me",
      name: params.customerName || params.brandName,
    },
    metadata: {
      brandId: params.brandId,
      brandName: params.brandName,
      paymentAttemptId,
      isRebid: String(Boolean(params.isRebid)),
      amount: String(params.amount),
      ...(params.metadata || {}),
    },
    return_url: returnUrl,
  });

  if (!session || !session.session_id || !session.checkout_url) {
    throw new Error("Dodo Payments did not return a valid session ID or checkout URL.");
  }

  return {
    sessionId: session.session_id,
    checkoutUrl: session.checkout_url,
    amount: params.amount,
    currency: "USD",
    paymentAttemptId,
  };
}

/**
 * Retrieves Dodo checkout session status directly from the Dodo API.
 */
export async function retrieveDodoCheckoutSession(sessionId: string) {
  if (!sessionId) {
    throw new Error("sessionId is required to retrieve Dodo checkout session.");
  }

  const client = getDodoClient();
  return await client.checkoutSessions.retrieve(sessionId);
}

/**
 * Retrieves Dodo payment status directly from the Dodo API.
 */
export async function retrieveDodoPayment(paymentId: string) {
  if (!paymentId) {
    throw new Error("paymentId is required to retrieve Dodo payment.");
  }

  const client = getDodoClient();
  return await client.payments.retrieve(paymentId);
}

/**
 * Verifies a Dodo Payments webhook payload using the official SDK unwrap.
 */
export function verifyDodoWebhook(params: {
  rawBody: string;
  headers: {
    "webhook-id"?: string | null;
    "webhook-signature"?: string | null;
    "webhook-timestamp"?: string | null;
    [key: string]: string | string[] | null | undefined;
  };
}) {
  const { rawBody, headers } = params;
  const webhookId = (headers["webhook-id"] || headers["Webhook-Id"]) as string;
  const webhookSignature = (headers["webhook-signature"] || headers["Webhook-Signature"]) as string;
  const webhookTimestamp = (headers["webhook-timestamp"] || headers["Webhook-Timestamp"]) as string;

  const webhookKey = getDodoWebhookKey();
  if (!webhookKey || webhookKey.trim() === "") {
    throw new Error(
      "Dodo Payments webhook key is not configured: DODO_PAYMENTS_WEBHOOK_KEY is missing."
    );
  }

  const client = getDodoClient();

  return client.webhooks.unwrap(rawBody, {
    headers: {
      "webhook-id": webhookId || "",
      "webhook-signature": webhookSignature || "",
      "webhook-timestamp": webhookTimestamp || "",
    },
    key: webhookKey,
  });
}
