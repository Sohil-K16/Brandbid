/**
 * Dodo Payments Environment Configuration Helper
 * 
 * Narrowing helper to guarantee type-safety for @dodopayments/nextjs and @dodopayments/core
 * which strictly accept the literal union: "test_mode" | "live_mode".
 */
export const dodoEnvironment: "test_mode" | "live_mode" =
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";

/**
 * Returns a safely formatted webhook signing key.
 * Dodo dashboard webhook secrets are formatted as whsec_<base64>.
 * standardwebhooks expects valid Base64; this helper ensures valid base64
 * even if a plain string placeholder is provided in development.
 */
export function getDodoWebhookKey(): string {
  const raw =
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ||
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ||
    "whsec_dGVzdF93ZWJob29rX3NlY3JldF8xMjM0NTY3ODkwMTI=";

  const content = raw.startsWith("whsec_") ? raw.slice(6) : raw;
  const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(content);

  if (isBase64) {
    return raw;
  }

  // Fallback: convert arbitrary placeholder string to valid base64
  return `whsec_${Buffer.from(raw).toString("base64")}`;
}

