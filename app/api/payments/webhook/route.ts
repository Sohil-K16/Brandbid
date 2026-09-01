import { NextResponse } from "next/server";
import { db, Payment, BidHistoryItem, ActivityItem } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      if (!paymentEntity) {
        return NextResponse.json({ success: true, message: "No payment entity found" });
      }

      const providerPaymentId = paymentEntity.id;
      const providerOrderId = paymentEntity.order_id;
      const amount = paymentEntity.amount / 100; // Convert from cents to USD
      const brandId = paymentEntity.notes?.brandId;

      if (!brandId) {
        return NextResponse.json({ success: true, message: "No brandId in notes" });
      }

      // Idempotency check: if payment already processed, acknowledge without re-applying
      const existing = db.getPaymentByProviderId(providerPaymentId);
      if (existing && existing.status === "verified") {
        return NextResponse.json({
          success: true,
          message: "Payment already processed",
        });
      }

      const brand = db.getBrandById(brandId);
      if (!brand) {
        return NextResponse.json(
          { success: false, error: "Brand not found" },
          { status: 404 }
        );
      }

      const beforeRankings = calculateRankings(db.getAllBrands());
      const previousRank = beforeRankings.find((b) => b.id === brandId)?.rank || null;
      const previousTotal = brand.totalBid;
      const newTotal = previousTotal + amount;
      const now = new Date().toISOString();

      // Record Payment
      const paymentRecord: Payment = {
        id: "pay_" + crypto.randomBytes(8).toString("hex"),
        brandId: brand.id,
        providerPaymentId,
        providerOrderId,
        amount,
        currency: "USD",
        status: "verified",
        createdAt: now,
        verifiedAt: now,
      };
      db.insertPayment(paymentRecord);

      // Update Brand
      db.updateBrand(brand.id, {
        totalBid: newTotal,
        status: "published",
        updatedAt: now,
      });

      // Recalculate ranking
      const afterRankings = calculateRankings(db.getAllBrands());
      const newRank = afterRankings.find((b) => b.id === brand.id)?.rank || 1;

      // Record Bid History
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

      // Record Activity
      let eventType: ActivityItem["eventType"] = "brand_entered";
      if (newRank === 1) {
        eventType = "became_number_one";
      } else if (previousRank && newRank < previousRank) {
        eventType = "rank_climbed";
      } else if (previousTotal > 0) {
        eventType = "bid_increased";
      }

      const activityItem: ActivityItem = {
        id: "act_" + crypto.randomBytes(8).toString("hex"),
        brandId: brand.id,
        eventType,
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
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[API] Razorpay webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
