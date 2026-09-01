import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRankings, getNextRank } from "@/lib/ranking/ranking-engine";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const brand = db.getBrandBySlug(slug);

    if (!brand || brand.status !== "published") {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const allBrands = db.getAllBrands();
    const ranked = calculateRankings(allBrands);
    const rankedBrand = ranked.find((b) => b.id === brand.id);

    if (!rankedBrand) {
      return NextResponse.json(
        { success: false, error: "Brand is not currently on the board" },
        { status: 404 }
      );
    }

    const climbInfo = getNextRank(brand.id, allBrands);
    const bidHistory = db.getBidHistoryByBrandId(brand.id);

    return NextResponse.json({
      success: true,
      data: {
        brand: rankedBrand,
        climbInfo,
        bidHistory,
      },
    });
  } catch (error) {
    console.error("[API] Brand detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch brand details" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const brand = db.getBrandBySlug(slug);

    if (brand) {
      db.incrementBrandClicks(brand.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Brand click error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
