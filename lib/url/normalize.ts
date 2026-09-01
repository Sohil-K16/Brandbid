/**
 * Normalizes a URL for deduplication and canonical matching.
 * Examples:
 *   "https://www.example.com/foo/" -> "example.com/foo"
 *   "HTTP://EXAMPLE.COM" -> "example.com"
 *   "https://linear.app/" -> "linear.app"
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";

  let urlStr = rawUrl.trim();

  // Add protocol if missing for URL parser
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = "https://" + urlStr;
  }

  try {
    const parsed = new URL(urlStr);
    let host = parsed.hostname.toLowerCase();
    
    // Strip leading www.
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }

    let pathname = parsed.pathname;
    // Strip trailing slashes
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    } else if (pathname === "/") {
      pathname = "";
    }

    return `${host}${pathname}`;
  } catch {
    // Fallback cleanup
    return urlStr
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
}

/**
 * Ensures a valid http/https URL with standard protocol.
 */
export function formatFullUrl(rawUrl: string): string {
  let trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = "https://" + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    let result = parsed.toString();
    if (parsed.pathname === "/" && !parsed.search && !parsed.hash) {
      result = result.replace(/\/$/, "");
    }
    return result;
  } catch {
    return trimmed;
  }
}

/**
 * Creates a clean URL slug from brand name or domain.
 * Examples:
 *   "Synthetix AI" -> "synthetix-ai"
 *   "Linear App" -> "linear-app"
 *   "https://acme.io" -> "acme-io"
 */
export function generateSlug(nameOrDomain: string): string {
  let str = nameOrDomain.trim().toLowerCase();
  
  // If it looks like a domain, strip common extensions or replace dots
  str = str
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^\w\s-]/g, "-") // replace non-alphanumeric with hyphen
    .replace(/[\s_-]+/g, "-")   // collapse dashes
    .replace(/^-+|-+$/g, "");   // trim dashes

  return str || "brand-" + Math.random().toString(36).substring(2, 8);
}
