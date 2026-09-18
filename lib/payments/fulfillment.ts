import { db, Payment, BidHistoryItem, ActivityItem } from "../db";
import { calculateRankings } from "../ranking/ranking-engine";
import crypto from "crypto";

export interface FulfillPaymentResult {
  success: boolean;
  message?: string;
  paymentId?: string;
  brandId?: string;
  amount?: number;
}

/**
 * Idempotently fulfills an order/payment recorded through Dodo Payments.
 * Safe to process the same webhook event multiple times.
 */
export async function fulfillDodoPayment(payload: any): Promise<FulfillPaymentResult> {
  const eventType = payload?.type || payload?.event;
  const dodoData = payload?.data || payload;

  // Check for successful payment / checkout session completion
  const isPaymentSuccess =
    eventType === "payment.succeeded" ||
    eventType === "checkout.session.completed" ||
    eventType === "order.paid" ||
    eventType === "payment.captured" ||
    dodoData?.status === "succeeded" ||
    dodoData?.payment_status === "succeeded";

  if (!isPaymentSuccess && eventType && !eventType.includes("succeeded")) {
    return {
      success: true,
      message: `Ignored unfulfilled event type: ${eventType}`,
    };
  }

  const providerPaymentId: string | null = dodoData?.payment_id || dodoData?.id || null;
  if (!providerPaymentId) {
    return { success: false, message: "Missing provider payment ID" };
  }

  const providerOrderId: string =
    dodoData?.session_id ||
    dodoData?.order_id ||
    providerPaymentId;

  const metadata = dodoData?.metadata || {};
  const brandId = metadata.brandId || metadata.brand_id;
  if (!brandId || typeof brandId !== "string") {
    return { success: false, message: "Missing or invalid metadata.brandId" };
  }

  const metadataAmount = Number(metadata.amount);
  const metadataAmountInCents = Number(metadata.amountInCents);
  const providerTotalAmountInCents =
    typeof dodoData?.total_amount === "number"
      ? dodoData.total_amount
      : typeof dodoData?.amount === "number"
        ? dodoData.amount
        : null;

  let amountFromProvider: number | null = null;
  if (providerTotalAmountInCents !== null && Number.isFinite(providerTotalAmountInCents) && providerTotalAmountInCents > 0) {
    amountFromProvider = providerTotalAmountInCents / 100;
  }

  if (!Number.isFinite(metadataAmount) || metadataAmount <= 0) {
    return { success: false, message: "Missing or invalid metadata.amount" };
  }

  if (Number.isFinite(metadataAmountInCents) && metadataAmountInCents > 0) {
    const normalized = metadataAmountInCents / 100;
    if (Math.abs(normalized - metadataAmount) > 0.01) {
      return { success: false, message: "Metadata amount mismatch" };
    }
  }

  if (amountFromProvider !== null && Math.abs(amountFromProvider - metadataAmount) > 0.01) {
    return { success: false, message: "Provider amount does not match metadata amount" };
  }
  const amount = amountFromProvider ?? metadataAmount;

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

  const brand = db.getBrandById(brandId);
  if (!brand) {
    console.warn(`[Dodo Fulfillment] Brand not found: ${brandId}`);
    return { success: false, message: `Brand not found: ${brandId}` };
  }

  const beforeRankings = calculateRankings(db.getAllBrands());
  const previousRank = beforeRankings.find((b) => b.id === brandId)?.rank || null;
  const previousTotal = brand.totalBid;
  const newTotal = previousTotal + amount;
  const now = new Date().toISOString();

  // 1. Record payment in DB
  const paymentRecord: Payment = {
    id: "pay_" + crypto.randomBytes(8).toString("hex"),
    brandId: brand.id,
    providerPaymentId,
    providerOrderId,
    amount,
    currency: dodoData?.currency || "USD",
    status: "verified",
    createdAt: now,
    verifiedAt: now,
  };
  db.insertPayment(paymentRecord);

  // 2. Update brand total bid & status
  db.updateBrand(brand.id, {
    totalBid: newTotal,
    status: "published",
    updatedAt: now,
  });

  // 3. Recalculate ranking
  const afterRankings = calculateRankings(db.getAllBrands());
  const newRank = afterRankings.find((b) => b.id === brand.id)?.rank || 1;

  // 4. Record bid history
  const historyItem: BidHistoryItem = {
    id: "hist_" + crypto.randomBytes(8).toString("hex"),
    brandId: brand.id,
    paymentId: paymentRecord.id,
    amountAdded: amount,
    previousTotal,
    newTotal,
    previousRank,
    newRank,
    createdAt: now,
  };
  db.insertBidHistory(historyItem);

  // 5. Record activity feed
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
}
