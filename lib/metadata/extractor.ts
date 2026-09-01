import { normalizeUrl } from "../url/normalize";

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
 * Best-effort metadata extractor from a website URL.
 * Designed to never fail catastrophically: if a site is unreachable,
 * it returns graceful defaults derived from the domain.
 */
export async function extractWebsiteMetadata(rawUrl: string): Promise<ExtractedMetadata> {
  let targetUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  let domain = "";
  try {
    const parsed = new URL(targetUrl);
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    domain = normalizeUrl(rawUrl);
  }

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BrandBidBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return fallbackData;
    }

    const html = await response.text();

    // 1. Extract Title
    let title = "";
    const ogTitleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i) ||
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
    const ogDescMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["'](.*?)["']/i) ||
                        html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:description["']/i);
    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1].trim();
    } else {
      const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
                            html.match(/<meta\s+content=["'](.*?)["']\s+name=["']description["']/i);
      if (metaDescMatch && metaDescMatch[1]) {
        description = metaDescMatch[1].trim();
      }
    }

    // 3. Extract Open Graph Image
    let ogImage: string | null = null;
    const ogImgMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["'](.*?)["']/i) ||
                       html.match(/<meta\s+content=["'](.*?)["']\s+(?:property|name)=["']og:image["']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      const rawImg = ogImgMatch[1].trim();
      if (/^https?:\/\//i.test(rawImg)) {
        ogImage = rawImg;
      } else {
        try {
          ogImage = new URL(rawImg, targetUrl).toString();
        } catch {
          ogImage = null;
        }
      }
    }

    // 4. Extract Favicon
    let logoUrl: string | null = null;
    const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["'](.*?)["']/i) ||
                      html.match(/<link\s+[^>]*href=["'](.*?)["'][^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i);
    if (iconMatch && iconMatch[1]) {
      const rawIcon = iconMatch[1].trim();
      if (/^https?:\/\//i.test(rawIcon)) {
        logoUrl = rawIcon;
      } else {
        try {
          logoUrl = new URL(rawIcon, targetUrl).toString();
        } catch {
          logoUrl = fallbackData.logoUrl;
        }
      }
    } else {
      logoUrl = fallbackData.logoUrl;
    }

    // Clean up brand name
    let cleanName = defaultName;
    if (title) {
      // Split on common delimiters like " | ", " - ", " : ", " • "
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
      tagline: description ? description.slice(0, 80) : fallbackData.tagline,
      logoUrl: logoUrl || fallbackData.logoUrl,
      ogImage,
      domain,
    };
  } catch {
    return fallbackData;
  }
}
