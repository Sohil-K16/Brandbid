import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import { retrieveDodoCheckoutSession, retrieveDodoPayment } from "@/lib/payments/dodo";
import { fulfillDodoPayment } from "@/lib/payments/fulfillment";

/**
 * Payment & Publication Status Endpoint with Authoritative Dodo Reconciliation.
 *
 * Security Guarantees:
 * - Authoritative: Only verifies payment status directly via Dodo API or cryptographically verified webhooks.
 * - Never trusts client-supplied claims of payment success.
 * - Idempotently fulfills verified succeeded payments via atomic transactions.
 * - Reports current BrandBid publication status and leaderboard rank.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id") || searchParams.get("sessionId") || "";
    const paymentId = searchParams.get("payment_id") || searchParams.get("paymentId") || "";
    const paymentAttemptId =
      searchParams.get("payment_attempt_id") ||
      searchParams.get("paymentAttemptId") ||
      searchParams.get("attempt_id") ||
      "";
    const brandIdParam = searchParams.get("brand_id") || searchParams.get("brandId") || "";

    if (!sessionId && !paymentId && !paymentAttemptId && !brandIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one identifier required: session_id, payment_id, payment_attempt_id, or brand_id",
        },
        { status: 400 }
      );
    }

    // 1. Locate payment record in database
    const allPayments = db.getAllPayments();
    let payment =
      (paymentId && db.getPaymentByProviderId(paymentId)) ||
      (paymentAttemptId && db.getPaymentByAttemptId(paymentAttemptId)) ||
      (sessionId &&
        allPayments.find(
          (p) =>
            p.providerOrderId === sessionId ||
            p.providerPaymentId === sessionId ||
            p.providerPaymentId === `pay_${sessionId.replace(/^cks_/, "")}`
        )) ||
      null;

    // 2. If payment record is not yet in DB, verify authoritative status directly from Dodo API
    if (!payment && (paymentId || sessionId)) {
      try {
        let dodoPaymentData: any = null;

        if (paymentId) {
          dodoPaymentData = await retrieveDodoPayment(paymentId);
        } else if (sessionId) {
          const dodoSession = await retrieveDodoCheckoutSession(sessionId);
          if (dodoSession && (dodoSession as any).payment_id) {
            dodoPaymentData = await retrieveDodoPayment((dodoSession as any).payment_id);
          }
        }

        if (dodoPaymentData && dodoPaymentData.status === "succeeded") {
          await fulfillDodoPayment({
            type: "payment.succeeded",
            data: dodoPaymentData,
          });

          // Reload updated payment record
          payment =
            (paymentId && db.getPaymentByProviderId(paymentId)) ||
            (dodoPaymentData.payment_id && db.getPaymentByProviderId(dodoPaymentData.payment_id)) ||
            null;
        }
      } catch (err: any) {
        // Silently continue if Dodo API check fails
      }
    }

    const resolvedBrandId = payment?.brandId || brandIdParam;
    const brand = resolvedBrandId ? db.getBrandById(resolvedBrandId) : null;

    // Calculate current ranking if brand exists
    let currentRank: number | null = null;
    if (brand) {
      const allBrands = db.getAllBrands();
      const rankings = calculateRankings(allBrands);
      const rankedBrand = rankings.find((b) => b.id === brand.id);
      currentRank = rankedBrand?.rank || null;
    }

    const isVerified = payment?.status === "verified";
    const status = payment?.status || "pending";

    return NextResponse.json({
      success: true,
      data: {
        status,
        isVerified,
        payment: payment
          ? {
              id: payment.id,
              providerPaymentId: payment.providerPaymentId,
              providerOrderId: payment.providerOrderId,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              verifiedAt: payment.verifiedAt,
            }
          : null,
        brand: brand
          ? {
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              totalBid: brand.totalBid,
              status: brand.status,
            }
          : null,
        rank: currentRank,
        isNumberOne: currentRank === 1,
      },
    });
  } catch (error: any) {
    console.error("[API] Payment status query error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve payment status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Support POST with JSON payload by mapping to GET logic
  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    if (body.sessionId || body.session_id) {
      url.searchParams.set("session_id", body.sessionId || body.session_id);
    }
    if (body.paymentId || body.payment_id) {
      url.searchParams.set("payment_id", body.paymentId || body.payment_id);
    }
    if (body.brandId || body.brand_id) {
      url.searchParams.set("brand_id", body.brandId || body.brand_id);
    }
    if (body.paymentAttemptId || body.payment_attempt_id) {
      url.searchParams.set("payment_attempt_id", body.paymentAttemptId || body.payment_attempt_id);
    }

    const forwardedReq = new NextRequest(url.toString(), {
      method: "GET",
      headers: req.headers,
    });
    return GET(forwardedReq);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request payload" }, { status: 400 });
  }
}
