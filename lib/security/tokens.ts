import crypto from "crypto";

/**
 * Generates a cryptographically random token for brand management.
 * Format: 32 bytes hex (64 characters)
 */
export function generateManagementToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generates SHA-256 hash of a management token to store in the database.
 * The raw token is only presented to the user upon claim/payment.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Constant-time token verification to prevent timing attacks.
 */
export function verifyToken(inputToken: string, storedHash: string): boolean {
  if (!inputToken || !storedHash) return false;
  const inputHash = hashToken(inputToken);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(inputHash, "utf8"),
      Buffer.from(storedHash, "utf8")
    );
  } catch {
    return false;
  }
}
