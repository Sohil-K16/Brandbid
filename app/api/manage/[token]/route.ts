import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security/tokens";
import { updateBrandSchema } from "@/lib/validation/schemas";
import { calculateRankings, getNextRank } from "@/lib/ranking/ranking-engine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = hashToken(token);
    const brand = db.getBrandByTokenHash(tokenHash);

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Invalid management token" },
        { status: 401 }
      );
    }

    const allBrands = db.getAllBrands();
    const ranked = calculateRankings(allBrands);
    const rankedBrand = ranked.find((b) => b.id === brand.id);
    const currentRank = rankedBrand ? rankedBrand.rank : null;
    const climbInfo = getNextRank(brand.id, allBrands);
    const payments = db.getPaymentsByBrandId(brand.id);
    const bidHistory = db.getBidHistoryByBrandId(brand.id);

    return NextResponse.json({
      success: true,
      data: {
        brand,
        rank: currentRank,
        climbInfo,
        payments,
        bidHistory,
      },
    });
  } catch (error) {
    console.error("[API] Manage brand GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to access brand management" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = hashToken(token);
    const brand = db.getBrandByTokenHash(tokenHash);

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Invalid management token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = updateBrandSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "Validation failed",
        },
        { status: 400 }
      );
    }

    const updated = db.updateBrand(brand.id, parseResult.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API] Manage brand PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update brand" },
      { status: 500 }
    );
  }
}
