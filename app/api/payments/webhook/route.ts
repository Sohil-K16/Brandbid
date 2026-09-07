import { NextResponse } from "next/server";
import { db, Payment, BidHistoryItem, ActivityItem } from "@/lib/db";
import { verifyDodoWebhook } from "@/lib/payments/dodo";
import { verifyWebhookSignature as verifyRazorpayWebhook } from "@/lib/payments/razorpay";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const dodoSignature =
      request.headers.get("webhook-signature") ||
      request.headers.get("Webhook-Signature");
    const razorpaySignature = request.headers.get("x-razorpay-signature");

    let event: any = null;

    if (dodoSignature || request.headers.get("webhook-id")) {
      // Dodo Payments Webhook
      const headersObj = {
        "webhook-id": request.headers.get("webhook-id"),
        "webhook-signature": dodoSignature,
        "webhook-timestamp": request.headers.get("webhook-timestamp"),
      };

      const verification = verifyDodoWebhook({ rawBody, headers: headersObj });
      if (!verification.isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "Invalid Dodo webhook signature" },
          { status: 400 }
        );
      }
      event = verification.event || JSON.parse(rawBody);
    } else if (razorpaySignature) {
      // Legacy Webhook
      const isValid = verifyRazorpayWebhook(rawBody, razorpaySignature);
      if (!isValid && process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { success: false, error: "Invalid Razorpay webhook signature" },
          { status: 400 }
        );
      }
      event = JSON.parse(rawBody);
    } else {
      // Development fallback
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        );
      }
    }

    const eventType = event?.type || event?.event;

    // Handle Dodo Payments (payment.succeeded) or Legacy (payment.captured / order.paid)
    if (
      eventType === "payment.succeeded" ||
      eventType === "checkout.session.completed" ||
      eventType === "payment.captured" ||
      eventType === "order.paid"
    ) {
      const dodoData = event.data;
      const razorpayEntity = event.payload?.payment?.entity;

      const providerPaymentId =
        dodoData?.payment_id ||
        dodoData?.id ||
        razorpayEntity?.id ||
        `pay_${Date.now()}`;

      const providerOrderId =
        dodoData?.session_id ||
        dodoData?.order_id ||
        razorpayEntity?.order_id ||
        `ord_${Date.now()}`;

      // Amount conversion: Dodo total_amount is in cents
      let amount: number = 0;
      if (typeof dodoData?.total_amount === "number") {
        amount = dodoData.total_amount / 100;
      } else if (typeof dodoData?.amount === "number") {
        amount = dodoData.amount > 1000 ? dodoData.amount / 100 : dodoData.amount;
      } else if (typeof razorpayEntity?.amount === "number") {
        amount = razorpayEntity.amount / 100;
      }

      const brandId =
        dodoData?.metadata?.brandId ||
        dodoData?.metadata?.brand_id ||
        razorpayEntity?.notes?.brandId;

      if (!brandId) {
        return NextResponse.json({ success: true, message: "No brandId found in metadata" });
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
