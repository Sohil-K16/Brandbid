import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPaymentSchema } from "@/lib/validation/schemas";
import { retrieveDodoCheckoutSession } from "@/lib/payments/dodo";
import { verifyRazorpaySignature } from "@/lib/payments/razorpay";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";
import crypto from "crypto";

function buildRankResponse(brandId: string) {
  const brand = db.getBrandById(brandId);
  if (!brand) return null;

  const rankings = calculateRankings(db.getAllBrands());
  const rank = rankings.find((b) => b.id === brand.id)?.rank || 1;

  return {
    brand,
    rank,
    totalBid: brand.totalBid,
    isNumberOne: rank === 1,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = verifyPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "Invalid payment payload",
        },
        { status: 400 }
      );
    }

    const {
      brandId,
      sessionId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount,
    } = parseResult.data;

    if (sessionId) {
      const dodoSession = await retrieveDodoCheckoutSession(sessionId);
      if (!dodoSession) {
        return NextResponse.json(
          { success: false, error: "Checkout session not found" },
          { status: 404 }
        );
      }

      const isSettled =
        (dodoSession as any).payment_status === "succeeded" ||
        (dodoSession as any).status === "completed";
      if (!isSettled) {
        return NextResponse.json(
          { success: false, error: "Payment is not settled yet" },
          { status: 202 }
        );
      }

      const fulfillment = await fulfillDodoPayment({
        type: "payment.succeeded",
        data: dodoSession,
      });

      if (!fulfillment.success || !fulfillment.brandId) {
        return NextResponse.json(
          { success: false, error: fulfillment.message || "Fulfillment failed" },
          { status: 400 }
        );
      }

      const responseData = buildRankResponse(fulfillment.brandId);
      if (!responseData) {
        return NextResponse.json(
          { success: false, error: "Associated brand not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: responseData });
    }

    // Legacy Razorpay verification path (non-Dodo flow)
    if (!(brandId && razorpayOrderId && razorpayPaymentId && razorpaySignature && amount)) {
      return NextResponse.json(
        { success: false, error: "sessionId is required for Dodo verification" },
        { status: 400 }
      );
    }

    const isValid = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Payment verification failed or signature mismatch" },
        { status: 400 }
      );
    }

    const brand = db.getBrandById(brandId);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Associated brand not found" },
        { status: 404 }
      );
    }

    const existingPayment = db.getPaymentByProviderId(razorpayPaymentId);
    if (!existingPayment) {
      const now = new Date().toISOString();
      db.insertPayment({
        id: "pay_" + crypto.randomBytes(8).toString("hex"),
        brandId: brand.id,
        providerPaymentId: razorpayPaymentId,
        providerOrderId: razorpayOrderId,
        amount,
        currency: "USD",
        status: "verified",
        createdAt: now,
        verifiedAt: now,
      });
      db.updateBrand(brand.id, {
        totalBid: brand.totalBid + amount,
        status: "published",
        updatedAt: now,
      });
    }

    const responseData = buildRankResponse(brand.id);
    return NextResponse.json({
      success: true,
      data: {
        ...responseData,
        alreadyProcessed: Boolean(existingPayment),
      },
    });
  } catch (error) {
    console.error("[API] Verify payment error:", error);
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
