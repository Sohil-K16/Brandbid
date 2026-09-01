"use client";

import React, { useMemo } from "react";
import { RankedBrand, estimateRankForBid } from "@/lib/ranking/ranking-engine";
import { Crown, Sparkles, TrendingUp } from "lucide-react";

export interface LiveRankEstimatorProps {
  bidAmount: number;
  existingBrands: RankedBrand[];
  currentBrandId?: string;
}

export default function LiveRankEstimator({
  bidAmount,
  existingBrands,
  currentBrandId,
}: LiveRankEstimatorProps) {
  const estimate = useMemo(() => {
    if (!bidAmount || bidAmount < 100) return null;
    return estimateRankForBid(bidAmount, existingBrands, currentBrandId);
  }, [bidAmount, existingBrands, currentBrandId]);

  if (!estimate) {
    return (
      <div className="p-3 bg-white/50 border border-dashed border-border rounded text-xs font-mono-num text-muted text-center">
        Enter a bid amount to see your estimated leaderboard position.
      </div>
    );
  }

  const isNo1 = estimate.isNumberOne;
  const rankStr = `#${estimate.estimatedRank}`;

  return (
    <div
      className={`p-4 rounded border transition-all ${
        isNo1
          ? "bg-[#E7B93C]/10 border-[#E7B93C] text-black shadow-sm"
          : estimate.estimatedRank <= 3
          ? "bg-[#BFC3C7]/15 border-[#BFC3C7] text-black"
          : "bg-white border-border text-foreground"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isNo1 ? (
            <Crown className="w-5 h-5 text-[#B88E18]" />
          ) : estimate.estimatedRank <= 10 ? (
            <TrendingUp className="w-5 h-5 text-accent" />
          ) : (
            <Sparkles className="w-4 h-4 text-muted" />
          )}

          <div>
            <span className="text-xs uppercase font-mono-num font-semibold text-muted block">
              Projected Ranking
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono-num tracking-tight leading-none">
              {rankStr} {isNo1 && "👑 (ON TOP)"}
            </span>
          </div>
        </div>

        <div className="text-right text-xs font-mono-num text-muted">
          <span>Ahead of </span>
          <strong className="text-foreground">{estimate.aheadOfCount}</strong> brands
        </div>
      </div>
    </div>
  );
}
