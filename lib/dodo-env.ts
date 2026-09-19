/**
 * Dodo Payments Environment Configuration Helper
 * 
 * Narrowing helper to guarantee type-safety for @dodopayments/nextjs and @dodopayments/core
 * which strictly accept the literal union: "test_mode" | "live_mode".
 */
export const dodoEnvironment: "test_mode" | "live_mode" =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";

/**
 * Returns the webhook signing key configured in the environment.
 * Prefers DODO_PAYMENTS_WEBHOOK_KEY, falling back to DODO_PAYMENTS_WEBHOOK_SECRET.
 * Normalizes keys prefixed with 'whsec_' or raw base64.
 * Does not hardcode secrets or credentials.
 */
export function getDodoWebhookKey(): string {
  const raw =
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ||
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
    "";

  if (!raw || raw.trim() === "") {
    return "";
  }

  const content = raw.startsWith("whsec_") ? raw.slice(6) : raw;
  const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(content);

  if (isBase64) {
    return raw.startsWith("whsec_") ? raw : `whsec_${raw}`;
  }

  // Fallback: convert arbitrary placeholder string to valid base64
  return `whsec_${Buffer.from(raw).toString("base64")}`;
}

