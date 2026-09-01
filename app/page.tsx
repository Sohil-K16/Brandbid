import React from "react";
import { db } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import HeroSection from "@/components/board/HeroSection";
import ActivityTicker from "@/components/board/ActivityTicker";
import Leaderboard from "@/components/board/Leaderboard";

// Server rendered with dynamic revalidation
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allBrands = db.getAllBrands();
  const rankedBrands = calculateRankings(allBrands);

  const totalBidVolume = rankedBrands.reduce((sum, b) => sum + b.totalBid, 0);
  const totalBrands = rankedBrands.length;

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Editorial Sparse Hero */}
      <HeroSection
        totalBidVolume={totalBidVolume}
        totalBrands={totalBrands}
      />

      {/* Live Activity Marquee Ticker */}
      <ActivityTicker />

      {/* The Central Exhibition Leaderboard */}
      <Leaderboard initialBrands={rankedBrands} />
    </div>
  );
}
