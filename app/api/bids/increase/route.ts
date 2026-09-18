import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { increaseBidSchema } from "@/lib/validation/schemas";
import { createDodoCheckoutSession, assertDodoCheckoutConfig } from "@/lib/payments/dodo";
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
    assertDodoCheckoutConfig();
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

    // Create Dodo payment checkout session
    const dodoSession = await createDodoCheckoutSession({
      amount: additionalBid,
      brandId: brand.id,
      brandName: brand.name,
      isRebid: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: dodoSession.sessionId,
        checkoutUrl: dodoSession.checkoutUrl,
        orderId: dodoSession.sessionId, // Backwards compatible
        amount: additionalBid,
        currency: dodoSession.currency,
        brandId: brand.id,
        brandName: brand.name,
        currentTotal: brand.totalBid,
        projectedTotal,
        projectedRank: projectedRank.estimatedRank,
        isMock: dodoSession.isMock,
      },
    });
  } catch (error: any) {
    console.error("[API] Increase bid error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create rebid order" },
      { status: 500 }
    );
  }
}
