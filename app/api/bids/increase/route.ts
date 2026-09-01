import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { increaseBidSchema } from "@/lib/validation/schemas";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { estimateRankForBid } from "@/lib/ranking/ranking-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = increaseBidSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "Invalid bid request",
        },
        { status: 400 }
      );
    }

    const { brandId, additionalBid } = parseResult.data;
    const brand = db.getBrandById(brandId);

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const projectedTotal = brand.totalBid + additionalBid;
    const allBrands = db.getAllBrands();
    const projectedRank = estimateRankForBid(projectedTotal, allBrands, brand.id);

    // Create payment order
    const orderReceipt = `rebid_${brandId.slice(0, 8)}_${Date.now()}`;
    const order = await createRazorpayOrder({
      amount: additionalBid,
      currency: "USD",
      receipt: orderReceipt,
      notes: {
        brandId: brand.id,
        isRebid: "true",
        name: brand.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: additionalBid,
        currency: order.currency,
        brandId: brand.id,
        brandName: brand.name,
        currentTotal: brand.totalBid,
        projectedTotal,
        projectedRank: projectedRank.estimatedRank,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_brandbid_local",
      },
    });
  } catch (error) {
    console.error("[API] Increase bid error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create rebid order" },
      { status: 500 }
    );
  }
}
