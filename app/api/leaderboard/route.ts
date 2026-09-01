import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const allBrands = db.getAllBrands();
    let ranked = calculateRankings(allBrands);

    // Platform statistics
    const totalBidVolume = ranked.reduce((sum, b) => sum + b.totalBid, 0);
    const totalBrands = ranked.length;

    // Filter if requested
    if (category && category !== "All") {
      ranked = ranked.filter((b) => b.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      ranked = ranked.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.websiteUrl.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        brands: ranked,
        stats: {
          totalBidVolume,
          totalBrands,
          highestBid: ranked.length > 0 ? ranked[0].totalBid : 0,
          averageBid: totalBrands > 0 ? Math.round(totalBidVolume / totalBrands) : 0,
        },
      },
    });
  } catch (error) {
    console.error("[API] Leaderboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
