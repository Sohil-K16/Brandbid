export type AnalyticsEvent =
  | "homepage_viewed"
  | "claim_clicked"
  | "website_entered"
  | "category_selected"
  | "bid_entered"
  | "checkout_started"
  | "payment_completed"
  | "brand_published"
  | "rank_changed"
  | "brand_viewed"
  | "website_clicked"
  | "share_clicked"
  | "bid_increased";

/**
 * Dispatches an analytics event.
 * Integrates with PostHog or custom API endpoint.
 */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${event}:`, properties || {});
  }

  // Send to internal analytics endpoint
  try {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        properties: properties || {},
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    }).catch(() => {
      // Ignore analytics network errors
    });
  } catch {
    // Ignore analytics errors
  }
}
