"use client";

import React from "react";
import { NextRankInfo, RankedBrand } from "@/lib/ranking/ranking-engine";
import { Button } from "../ui/Button";
import { TrendingUp, Crown } from "lucide-react";

export interface ClimbWidgetProps {
  brand: RankedBrand;
  climbInfo: NextRankInfo | null;
  onOpenRebid: () => void;
}

export default function ClimbWidget({
  brand,
  climbInfo,
  onOpenRebid,
}: ClimbWidgetProps) {
  const isNo1 = brand.rank === 1;

  const formattedCurrentBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  if (isNo1) {
    return (
      <div className="w-full bg-[#E7B93C]/15 border border-[#E7B93C] rounded p-6 sm:p-8 text-center space-y-3 shadow-gold">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#E7B93C] text-black">
          <Crown className="w-5 h-5" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black font-display uppercase tracking-tight text-foreground">
          YOU&apos;RE CURRENTLY ON TOP 👑
        </h3>
        <p className="text-xs sm:text-sm text-foreground/80 max-w-md mx-auto">
          Holding #1 with {formattedCurrentBid}. Defend your throne by boosting your lead anytime.
        </p>
        <div className="pt-2">
          <Button size="md" variant="gold" onClick={onOpenRebid} className="font-mono-num">
            Boost Lead (+ Increase Bid) →
          </Button>
        </div>
      </div>
    );
  }

  if (!climbInfo) return null;

  const formattedNextBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(climbInfo.nextRankBid);

  const formattedGap = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(climbInfo.gap);

  return (
    <div className="w-full bg-white border border-border rounded p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-mono-num font-semibold text-muted uppercase tracking-wider block">
            Rank Status
          </span>
          <div className="text-2xl sm:text-3xl font-black font-display text-foreground uppercase tracking-tight">
            YOU ARE #{brand.rank}
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono-num">
          <div>
            <span className="text-muted block">YOUR CURRENT BID</span>
            <span className="text-base font-bold text-foreground">{formattedCurrentBid}</span>
          </div>

          <div className="border-l border-border pl-6">
            <span className="text-muted block">#{climbInfo.nextRank} ({climbInfo.nextBrandName || "Leader"})</span>
            <span className="text-base font-bold text-foreground">{formattedNextBid}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2.5 rounded bg-accent/10 text-accent">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono-num text-muted uppercase tracking-wider">
              Want to climb to #{climbInfo.nextRank}?
            </div>
            <div className="text-lg sm:text-xl font-black font-mono-num text-foreground">
              ONLY <span className="text-accent">{formattedGap}</span> TO GO
            </div>
          </div>
        </div>

        <Button size="md" variant="primary" onClick={onOpenRebid} className="font-mono-num w-full sm:w-auto">
          Increase Bid to Climb →
        </Button>
      </div>
    </div>
  );
}
