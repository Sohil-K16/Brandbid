import { db, Payment, BidHistoryItem, ActivityItem, Brand } from "../db";
import { isPostgresConfigured, postgresDb } from "../db/postgres";
import { calculateRankings } from "../ranking/ranking-engine";
import { assessBrandSafety } from "../security/url-security";
import crypto from "crypto";

export interface FulfillPaymentResult {
  success: boolean;
  message?: string;
  paymentId?: string;
  brandId?: string;
  amount?: number;
}

/**
 * Idempotently fulfills a verified Dodo Payment event inside an atomic database transaction.
 * Safe against concurrent deliveries and duplicate webhook triggers.
 */
export async function fulfillDodoPayment(payload: any): Promise<FulfillPaymentResult> {
  const eventType = payload?.type || payload?.event;
  const dodoData = payload?.data || payload;

  // 1. Ignore non-payment events gracefully (e.g. subscriptions, license keys)
  const isPaymentEvent =
    eventType?.startsWith("payment.") ||
    eventType?.startsWith("checkout.") ||
    eventType?.startsWith("order.") ||
    Boolean(dodoData?.payment_id || dodoData?.session_id);

  if (!isPaymentEvent) {
    return {
      success: true,
      message: `Ignored unhandled event type: ${eventType || "unknown"}`,
    };
  }

  // 2. Validate presence of provider identifiers for payment events
  const providerOrderId: string =
    dodoData?.session_id ||
    dodoData?.order_id ||
    dodoData?.id ||
    "";

  if (!dodoData?.payment_id && !providerOrderId) {
    console.warn("[Dodo Fulfillment] Malformed webhook: missing payment_id and session_id");
    return { success: false, message: "Missing provider payment and session identifier" };
  }

  const providerPaymentId: string =
    dodoData?.payment_id ||
    (providerOrderId.startsWith("pay_") ? providerOrderId : `pay_${providerOrderId.replace(/^cks_/, "")}`);

  const brandId: string =
    dodoData?.metadata?.brandId ||
    dodoData?.metadata?.brand_id ||
    "";

  const paymentAttemptId: string =
    dodoData?.metadata?.paymentAttemptId ||
    "";

  // 1. Handle Failed / Cancelled Payments
  if (
    eventType === "payment.failed" ||
    eventType === "payment.cancelled" ||
    dodoData?.status === "failed" ||
    dodoData?.status === "cancelled"
  ) {
    return await db.transaction(async () => {
      const status = eventType === "payment.cancelled" || dodoData?.status === "cancelled" 
        ? "cancelled" 
        : "failed";

      if (brandId) {
        db.insertPayment({
          id: "pay_" + crypto.randomBytes(8).toString("hex"),
          brandId,
          provider: "dodo",
          providerPaymentId,
          providerSessionId: providerOrderId,
          providerOrderId,
          paymentAttemptId,
          amount: 0,
          currency: dodoData?.currency || "USD",
          status,
          createdAt: new Date().toISOString(),
          verifiedAt: null,
        });
      }

      return {
        success: true,
        message: `Payment ${status} recorded. Bid was not increased.`,
        brandId,
        paymentId: providerPaymentId,
      };
    });
  }

  // 2. Check for successful payment / checkout session completion
  const isPaymentSuccess =
    eventType === "payment.succeeded" ||
    eventType === "checkout.session.completed" ||
    eventType === "order.paid" ||
    eventType === "payment.captured" ||
    dodoData?.status === "succeeded" ||
    dodoData?.payment_status === "succeeded";

  if (!isPaymentSuccess) {
    return {
      success: true,
      message: `Ignored unhandled event type: ${eventType || "unknown"}`,
    };
  }

  // 3. Enforce currency validation (must settle in USD)
  const settlementCurrency = (
    dodoData?.settlement_currency ||
    dodoData?.currency ||
    "USD"
  ).toUpperCase();

  if (settlementCurrency !== "USD") {
    console.warn(`[Dodo Fulfillment] Unsupported settlement currency: ${settlementCurrency}, expected USD`);
    return { success: false, message: `Unsupported settlement currency: ${settlementCurrency}` };
  }

  // 4. Obtain verified amount strictly from Dodo payment data in USD cents
  let rawCents: number | null = null;
  if (
    typeof dodoData?.settlement_amount === "number" &&
    (dodoData?.settlement_currency === "USD" || !dodoData?.settlement_currency)
  ) {
    const taxCents = typeof dodoData?.settlement_tax === "number" ? dodoData.settlement_tax : 0;
    rawCents = Math.max(0, dodoData.settlement_amount - taxCents);
    if (rawCents === 0 && dodoData.settlement_amount > 0) {
      rawCents = dodoData.settlement_amount;
    }
  } else if (typeof dodoData?.total_amount === "number") {
    const taxCents = typeof dodoData?.tax === "number" ? dodoData.tax : 0;
    if ((dodoData?.currency || "USD").toUpperCase() === "USD") {
      rawCents = Math.max(0, dodoData.total_amount - taxCents);
      if (rawCents === 0 && dodoData.total_amount > 0) {
        rawCents = dodoData.total_amount;
      }
    } else {
      rawCents = dodoData.total_amount;
    }
  } else if (typeof dodoData?.amount === "number") {
    rawCents = dodoData.amount;
  }

  if (rawCents === null || isNaN(rawCents) || rawCents <= 0) {
    console.warn(`[Dodo Fulfillment] Verified payment ${providerPaymentId} has invalid or non-positive amount`);
    return { success: false, message: "Invalid or missing verified payment amount" };
  }

  // Convert cents to USD dollars, rounded to 2 decimal places to avoid floating-point drift
  const amount = Math.round(rawCents) / 100;

  if (!brandId) {
    console.warn(`[Dodo Fulfillment] No brandId present in verified webhook metadata for payment: ${providerPaymentId}`);
    return { success: true, message: "No brandId provided in metadata" };
  }

  // 4. PostgreSQL Production Execution (if configured)
  if (isPostgresConfigured()) {
    return await postgresDb.fulfillPaymentInTransaction({
      brandId,
      providerPaymentId,
      providerOrderId,
      providerSessionId: providerOrderId,
      paymentAttemptId,
      amount,
      currency: dodoData?.currency || "USD",
    });
  }

  // 5. Atomic Execution & Strict Idempotency Check (Local & Test Fallback)
  return await db.transaction(async () => {
    // Idempotency: verify if this payment was already credited
    const existingPayment = db.getPaymentByProviderId(providerPaymentId);
    if (existingPayment && existingPayment.status === "verified") {
      return {
        success: true,
        message: "Payment already processed (idempotent skip)",
        paymentId: existingPayment.id,
        brandId,
        amount,
      };
    }

    let brand = db.getBrandById(brandId);
    if (!brand) {
      console.warn(`[Dodo Fulfillment] Brand not found locally for ${brandId}, restoring from verified payment metadata`);
      const brandName = (dodoData?.metadata?.brandName || dodoData?.customer?.name || "Claimed Brand").trim();
      const slug = `brand-${brandId.replace(/^brand_/, "")}`;
      const now = new Date().toISOString();
      brand = {
        id: brandId,
        websiteUrl: dodoData?.metadata?.websiteUrl || `https://${brandName.toLowerCase().replace(/[^a-z0-9]/g, "") || "brand"}.com`,
        canonicalUrl: dodoData?.metadata?.canonicalUrl || brandName.toLowerCase().replace(/[^a-z0-9]/g, "") || "brand.com",
        slug,
        name: brandName,
        category: dodoData?.metadata?.category || "General",
        logoUrl: dodoData?.metadata?.logoUrl || null,
        description: dodoData?.metadata?.description || `Verified brand placement for ${brandName}`,
        tagline: dodoData?.metadata?.tagline || null,
        totalBid: 0,
        status: "published",
        managementTokenHash: "",
        template: "typography",
        clickCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      db.insertBrand(brand);
    }

    const beforeRankings = calculateRankings(db.getAllBrands());
    const previousRank = beforeRankings.find((b) => b.id === brandId)?.rank || null;
    const previousTotal = brand.totalBid;
    const newTotal = Math.round((previousTotal + amount) * 100) / 100;
    const now = new Date().toISOString();

    // A. Record payment in DB
    const paymentRecord: Payment = {
      id: existingPayment?.id || ("pay_" + crypto.randomBytes(8).toString("hex")),
      brandId: brand.id,
      provider: "dodo",
      providerPaymentId,
      providerSessionId: providerOrderId,
      providerOrderId,
      paymentAttemptId,
      amount,
      currency: dodoData?.currency || "USD",
      status: "verified",
      createdAt: existingPayment?.createdAt || now,
      verifiedAt: now,
    };
    db.insertPayment(paymentRecord);

    // B. Safety & Moderation Evaluation:
    // If brand was already published, maintain published status.
    // If new or pending, assess safety; publish only if safe, otherwise hold in pending for admin approval.
    const safetyCheck = assessBrandSafety(brand.websiteUrl, brand.name, brand.description || "");
    const shouldPublish = brand.status === "published" || safetyCheck.safe;
    const finalStatus: Brand["status"] = shouldPublish ? "published" : "pending";

    db.updateBrand(brand.id, {
      totalBid: newTotal,
      status: finalStatus,
      updatedAt: now,
    });

    if (!shouldPublish) {
      console.warn(`[Moderation] Brand ${brand.id} (${brand.name}) held in pending status for review: ${safetyCheck.reason}`);
      return {
        success: true,
        message: `Payment verified. Brand held in pending status for moderation review: ${safetyCheck.reason}`,
        paymentId: paymentRecord.id,
        brandId,
        amount,
      };
    }

    // C. Recalculate ranking for published brands
    const afterRankings = calculateRankings(db.getAllBrands());
    const newRank = afterRankings.find((b) => b.id === brand.id)?.rank || 1;

    // D. Record bid history
    const historyItem: BidHistoryItem = {
      id: "hist_" + crypto.randomBytes(8).toString("hex"),
      brandId: brand.id,
      paymentId: paymentRecord.id,
      amount,
      totalAfter: newTotal,
      amountAdded: amount,
      previousTotal,
      newTotal,
      previousRank,
      newRank,
      createdAt: now,
    };
    db.insertBidHistory(historyItem);

    // E. Record activity feed
    let activityType: ActivityItem["eventType"] = "brand_entered";
    if (newRank === 1) {
      activityType = "became_number_one";
    } else if (previousRank && newRank < previousRank) {
      activityType = "rank_climbed";
    } else if (previousTotal > 0) {
      activityType = "bid_increased";
    }

    const activityItem: ActivityItem = {
      id: "act_" + crypto.randomBytes(8).toString("hex"),
      brandId: brand.id,
      eventType: activityType,
      metadata: {
        brandName: brand.name,
        rank: newRank,
        previousRank,
        amountAdded: amount,
        totalBid: newTotal,
        slug: brand.slug,
      },
      createdAt: now,
    };
    db.insertActivity(activityItem);

    return {
      success: true,
      message: "Payment successfully fulfilled and brand ranking updated",
      paymentId: paymentRecord.id,
      brandId,
      amount,
    };
  });
}

