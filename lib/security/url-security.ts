import dns from "dns";
import {
  isIP,
  FORBIDDEN_HOSTNAMES,
  hasForbiddenDomainSuffix,
  isPrivateOrInternalIp,
  validateUrlSecurity,
  isSafeAssetUrl,
  assessBrandSafety,
} from "./url-validation";

// Re-export all validation utilities for backwards compatibility
export {
  isIP,
  FORBIDDEN_HOSTNAMES,
  hasForbiddenDomainSuffix,
  isPrivateOrInternalIp,
  validateUrlSecurity,
  isSafeAssetUrl,
  assessBrandSafety,
};

/**
 * Resolves a hostname via DNS and checks all resulting IP addresses
 * against private and internal IP ranges to defend against DNS rebinding attacks.
 */
export async function safeResolveAndValidateHost(hostname: string): Promise<{
  safe: boolean;
  error?: string;
  ip?: string;
}> {
  const lowerHost = hostname.toLowerCase();

  if (FORBIDDEN_HOSTNAMES.has(lowerHost) || hasForbiddenDomainSuffix(lowerHost)) {
    return { safe: false, error: `Host '${hostname}' is prohibited` };
  }

  // If already an IP literal
  if (isIP(lowerHost)) {
    if (isPrivateOrInternalIp(lowerHost)) {
      return { safe: false, error: `IP '${hostname}' resolves to a private or restricted network` };
    }
    return { safe: true, ip: lowerHost };
  }

  try {
    const lookupResults = await dns.promises.lookup(lowerHost, { all: true });

    if (!lookupResults || lookupResults.length === 0) {
      return { safe: false, error: `Could not resolve hostname '${hostname}'` };
    }

    for (const record of lookupResults) {
      if (isPrivateOrInternalIp(record.address)) {
        return {
          safe: false,
          error: `Hostname '${hostname}' resolves to private/internal IP address (${record.address})`,
        };
      }
    }

    return { safe: true, ip: lookupResults[0].address };
  } catch (err: any) {
    return { safe: false, error: `DNS lookup failed for '${hostname}': ${err.message}` };
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  allowedContentTypes?: string[];
  headers?: Record<string, string>;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  url: string;
  contentType: string;
  text: () => Promise<string>;
  buffer: () => Promise<Buffer>;
}

/**
 * SSRF-hardened server-side HTTP fetch client.
 * Features:
 * 1. Scheme validation (HTTP/HTTPS only).
 * 2. DNS resolution and IP verification prior to connection.
 * 3. Manual redirect following with re-validation on every redirect hop.
 * 4. Request timeout enforcement via AbortController.
 * 5. Content-Type header inspection.
 * 6. Strict response payload size limits.
 */
export async function safeFetch(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const {
    timeoutMs = 4000,
    maxBytes = 1024 * 1024, // 1MB default
    maxRedirects = 3,
    allowedContentTypes,
    headers = {},
  } = options;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    // 1. Syntactic & scheme validation
    const validation = validateUrlSecurity(currentUrl);
    if (!validation.valid || !validation.url) {
      throw new Error(`SSRF Block: ${validation.error || "Invalid URL"}`);
    }

    // 2. DNS resolution & IP range check (protects against DNS rebinding)
    const hostname = validation.url.hostname;
    const hostValidation = await safeResolveAndValidateHost(hostname);
    if (!hostValidation.safe) {
      throw new Error(`SSRF Block: ${hostValidation.error}`);
    }

    // 3. Perform network request with timeout controller and manual redirects
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 BrandBidBot/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8",
          ...headers,
        },
        signal: controller.signal,
        redirect: "manual", // Crucial: inspect redirects manually to prevent redirect SSRF
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    // 4. Handle HTTP Redirects safely (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect response missing Location header");
      }

      // Resolve relative redirects against current URL
      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new Error(`Malformed redirect Location: ${location}`);
      }

      // Re-validate the redirect destination immediately before looping
      const redirectCheck = validateUrlSecurity(nextUrl);
      if (!redirectCheck.valid) {
        throw new Error(`SSRF Block on redirect: ${redirectCheck.error}`);
      }

      currentUrl = nextUrl;
      redirectsCount++;
      continue;
    }

    // 5. Validate Content-Type if specified
    const contentType = response.headers.get("content-type") || "";
    if (allowedContentTypes && allowedContentTypes.length > 0) {
      const isAllowed = allowedContentTypes.some((allowed) =>
        contentType.toLowerCase().includes(allowed.toLowerCase())
      );
      if (!isAllowed) {
        throw new Error(`Disallowed content-type '${contentType}'`);
      }
    }

    // 6. Check Content-Length header if provided
    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const length = parseInt(contentLengthHeader, 10);
      if (!isNaN(length) && length > maxBytes) {
        throw new Error(`Response size (${length} bytes) exceeds limit of ${maxBytes} bytes`);
      }
    }

    // 7. Return wrapped response with size-bounded readers
    return {
      ok: response.ok,
      status: response.status,
      url: currentUrl,
      contentType,
      text: async () => {
        const rawText = await response.text();
        if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
          return rawText.slice(0, maxBytes);
        }
        return rawText;
      },
      buffer: async () => {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > maxBytes) {
          throw new Error(`Response payload exceeded limit of ${maxBytes} bytes`);
        }
        return Buffer.from(arrayBuf);
      },
    };
  }

  throw new Error(`Too many redirects (maximum ${maxRedirects})`);
}
