import { normalizeUrl } from "../url/normalize";
import { validateUrlSecurity, safeFetch } from "../security/url-security";

export interface ExtractedMetadata {
  title: string;
  name: string;
  description: string;
  tagline: string;
  logoUrl: string | null;
  ogImage: string | null;
  domain: string;
}

/**
 * Validates whether an extracted asset URL (e.g. logo or OG image) is safe to return.
 * Rejects javascript:, data:, file:, and internal IP URLs.
 */
function isSafeAssetUrl(rawUrl: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  const check = validateUrlSecurity(trimmed);
  if (!check.valid || !check.url) return null;
  return check.url.toString();
}

/**
 * Best-effort metadata extractor from a website URL protected by SSRF and scheme validation.
 * Features:
 * - Scheme validation (strictly HTTP/HTTPS)
 * - SSRF protection (rejects private, loopback, and cloud metadata targets)
 * - Redirect protection (validates each redirect hop)
 * - Request timeout and response size limits
 */
export async function extractWebsiteMetadata(rawUrl: string): Promise<ExtractedMetadata> {
  const urlCheck = validateUrlSecurity(rawUrl);
  if (!urlCheck.valid || !urlCheck.url) {
    throw new Error(urlCheck.error || "Invalid or prohibited URL");
  }

  const targetUrl = urlCheck.url.toString();
  const domain = urlCheck.url.hostname.replace(/^www\./, "");

  // Derive sensible default name from domain (e.g. "linear.app" -> "Linear", "stripe.com" -> "Stripe")
  const domainParts = domain.split(".");
  const rawBrandName = domainParts.length > 0 ? domainParts[0] : "Brand";
  const defaultName = rawBrandName.charAt(0).toUpperCase() + rawBrandName.slice(1);

  const fallbackData: ExtractedMetadata = {
    title: defaultName,
    name: defaultName,
    description: `Official website for ${defaultName}.`,
    tagline: `Discover ${defaultName}`,
    logoUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    ogImage: null,
    domain,
  };

  try {
    const response = await safeFetch(targetUrl, {
      timeoutMs: 4000,
      maxBytes: 2 * 1024 * 1024, // 2MB HTML limit
      maxRedirects: 3,
      allowedContentTypes: ["text/html", "application/xhtml+xml", "text/xml", "application/xml"],
    });

    if (!response.ok) {
      return fallbackData;
    }

    const html = await response.text();

    // 1. Extract Title
    let title = "";
    const ogTitleMatch =
      html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:title["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\s+/g, " ").trim();
      }
    }

    // 2. Extract Description / Tagline
    let description = "";
    const ogDescMatch =
      html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:description["']/i);
    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1].trim();
    } else {
      const metaDescMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
        html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
      if (metaDescMatch && metaDescMatch[1]) {
        description = metaDescMatch[1].trim();
      }
    }

    // 3. Extract Open Graph Image (safely resolved and scheme-validated)
    let ogImage: string | null = null;
    const ogImgMatch =
      html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:image["']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      const rawImg = ogImgMatch[1].trim();
      try {
        const resolvedImg = new URL(rawImg, targetUrl).toString();
        ogImage = isSafeAssetUrl(resolvedImg);
      } catch {
        ogImage = null;
      }
    }

    // 4. Extract Favicon (safely resolved and scheme-validated)
    let logoUrl: string | null = null;
    const iconMatch =
      html.match(/<link\s+[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["'](.*?)["']/i) ||
      html.match(/<link\s+[^>]*href=["'](.*?)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
    if (iconMatch && iconMatch[1]) {
      const rawIcon = iconMatch[1].trim();
      try {
        const resolvedIcon = new URL(rawIcon, targetUrl).toString();
        logoUrl = isSafeAssetUrl(resolvedIcon);
      } catch {
        logoUrl = fallbackData.logoUrl;
      }
    } else {
      logoUrl = fallbackData.logoUrl;
    }

    // Clean up brand name
    let cleanName = defaultName;
    if (title) {
      const parts = title.split(/\s*[-–—|:•]\s*/);
      if (parts.length > 0 && parts[0].length >= 2 && parts[0].length <= 35) {
        cleanName = parts[0].trim();
      } else {
        cleanName = title.slice(0, 35).trim();
      }
    }

    return {
      title: title || defaultName,
      name: cleanName || defaultName,
      description: description || fallbackData.description,
      tagline: description ? description.slice(0, 100) : fallbackData.tagline,
      logoUrl: logoUrl || fallbackData.logoUrl,
      ogImage,
      domain,
    };
  } catch (error: any) {
    // If blocked specifically by SSRF defense, propagate error
    if (error.message && error.message.includes("SSRF Block")) {
      throw error;
    }

    // Otherwise return graceful fallback for standard public site connection timeouts
    console.warn(`[Metadata Extractor] Could not reach ${targetUrl} (${error.message}), using domain fallbacks.`);
    return fallbackData;
  }
}
