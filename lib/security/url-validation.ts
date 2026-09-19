/**
 * Pure, isomorphic URL security validation functions.
 * Safe to import in both Server and Client environments (no Node.js built-in dependencies).
 */

export function isIP(str: string): 0 | 4 | 6 {
  if (!str || typeof str !== "string") return 0;
  // IPv4: 4 decimal octets 0-255
  if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str)) {
    return 4;
  }
  // IPv6: contains colons and valid hex
  if (str.includes(":") && /^[0-9a-fA-F:]+$/.test(str)) {
    return 6;
  }
  return 0;
}

/**
 * Known internal, loopback, or cloud-metadata domain patterns.
 */
export const FORBIDDEN_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "::",
  "metadata.google.internal",
  "metadata.azure.com",
  "instance-data",
  "kubernetes.default",
]);

/**
 * Checks if a hostname or domain ends with private or reserved TLDs.
 */
export function hasForbiddenDomainSuffix(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  const forbiddenSuffixes = [
    ".local",
    ".internal",
    ".lan",
    ".corp",
    ".home",
    ".arpa",
    ".invalid",
    ".test",
    ".onion",
    ".localhost",
  ];
  return forbiddenSuffixes.some((suffix) => lower.endsWith(suffix));
}

/**
 * Determines whether an IP address belongs to private, loopback, link-local,
 * carrier-grade NAT, multicast, or cloud metadata ranges.
 */
export function isPrivateOrInternalIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 0) return false;

  if (version === 4) {
    const parts = ip.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private RFC 1918)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private RFC 1918)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local & Cloud metadata: AWS, GCP, Azure, DigitalOcean)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT / RFC 6598)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved / Future use)
    if (a >= 240) return true;
    // 255.255.255.255 (Broadcast)
    if (a === 255) return true;

    return false;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    // Loopback ::1 or unspecified ::
    if (lower === "::1" || lower === "::" || lower === "0:0:0:0:0:0:0:1") return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (lower.startsWith("::ffff:")) {
      const v4Part = lower.slice(7);
      return isPrivateOrInternalIp(v4Part);
    }
    // Link-local unicast: fe80::/10
    if (/^fe[89ab]/i.test(lower)) return true;
    // Unique local address: fc00::/7 (fc00 to fdff)
    if (/^f[cd]/i.test(lower)) return true;
    // Discard prefix / Documentation (100::/64, 2001:db8::/32)
    if (lower.startsWith("100:") || lower.startsWith("2001:db8:")) return true;

    return false;
  }

  return false;
}

/**
 * Validates a URL against dangerous schemes and initial hostname blocklists.
 */
export function validateUrlSecurity(rawUrl: string): {
  valid: boolean;
  error?: string;
  url?: URL;
} {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "URL is empty or not a string" };
  }

  const trimmed = rawUrl.trim();

  // Explicit check for dangerous scheme prefixes
  const lowerTrimmed = trimmed.toLowerCase();
  const dangerousSchemes = [
    "javascript:",
    "data:",
    "file:",
    "ftp:",
    "blob:",
    "vbscript:",
    "gopher:",
    "ldap:",
  ];
  for (const scheme of dangerousSchemes) {
    if (lowerTrimmed.startsWith(scheme)) {
      return { valid: false, error: `Dangerous URL scheme '${scheme}' is strictly prohibited` };
    }
  }

  // Ensure http or https protocol
  let urlObj: URL;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    urlObj = new URL(candidate);
  } catch {
    return { valid: false, error: "Malformed URL syntax" };
  }

  if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
    return { valid: false, error: `Protocol '${urlObj.protocol}' is not permitted. Only HTTP and HTTPS are allowed.` };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // Hostname must not be empty
  if (!hostname) {
    return { valid: false, error: "Missing or invalid hostname in URL" };
  }

  // Disallow userinfo (e.g. https://user:pass@example.com)
  if (urlObj.username || urlObj.password) {
    return { valid: false, error: "URLs containing credentials or user-info are prohibited" };
  }

  // Check known forbidden hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname) || hasForbiddenDomainSuffix(hostname)) {
    return { valid: false, error: `Access to internal host '${hostname}' is blocked for security` };
  }

  // If hostname is directly an IP, verify IP ranges
  if (isIP(hostname)) {
    if (isPrivateOrInternalIp(hostname)) {
      return { valid: false, error: `Direct access to private or internal IP '${hostname}' is prohibited` };
    }
  }

  return { valid: true, url: urlObj };
}

/**
 * Validates whether an extracted image/logo asset URL is safe to fetch or reference.
 */
export function isSafeAssetUrl(assetUrl: string): boolean {
  if (!assetUrl || typeof assetUrl !== "string") return false;
  const lower = assetUrl.trim().toLowerCase();

  // Block dangerous schemes
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  const check = validateUrlSecurity(assetUrl);
  return check.valid;
}

/**
 * Automated safety check for brand publishing.
 * Verifies URL safety and checks for suspicious keywords/indicators.
 */
export function assessBrandSafety(
  websiteUrl: string,
  name?: string,
  description?: string
): { safe: boolean; flagged: boolean; reason?: string } {
  // 1. URL Scheme & SSRF validation
  const urlCheck = validateUrlSecurity(websiteUrl);
  if (!urlCheck.valid) {
    return { safe: false, flagged: true, reason: urlCheck.error };
  }

  // 2. Disallow raw IP URLs as published brands (standard web practice)
  if (urlCheck.url && isIP(urlCheck.url.hostname)) {
    return {
      safe: false,
      flagged: true,
      reason: "Direct IP addresses cannot be published as public brand listings",
    };
  }

  // 3. Prohibited & High-Risk Content Indicators
  const contentToInspect = `${websiteUrl} ${name || ""} ${description || ""}`.toLowerCase();
  const highRiskPatterns = [
    /\b(phishing|malware|exploit-kit|ransomware|stealer)\b/i,
    /\b(free-crypto-giveaway|doubler|drainer|ponzi)\b/i,
    /\b(credit-card-generator|dumps-pin)\b/i,
  ];

  for (const pattern of highRiskPatterns) {
    if (pattern.test(contentToInspect)) {
      return {
        safe: false,
        flagged: true,
        reason: "Content contains flagged terms requiring manual administrator moderation",
      };
    }
  }

  return { safe: true, flagged: false };
}
