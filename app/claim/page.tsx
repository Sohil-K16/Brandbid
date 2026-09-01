import React from "react";
import { db } from "@/lib/db";
import { calculateRankings } from "@/lib/ranking/ranking-engine";
import ClaimForm from "@/components/claim/ClaimForm";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim Your Spot — BrandBid.me",
  description: "Put your website on the public leaderboard. The higher you bid, the higher you rank.",
};

export const dynamic = "force-dynamic";

export default function ClaimPage() {
  const allBrands = db.getAllBrands();
  const rankedBrands = calculateRankings(allBrands);

  return (
    <div className="w-full min-h-screen py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-left">
          <Link
            href="/"
            className="text-xs font-mono-num text-muted hover:text-foreground transition-colors inline-block mb-4"
          >
            ← Back to Leaderboard
          </Link>
        </div>

        <ClaimForm existingBrands={rankedBrands} />
      </div>
    </div>
  );
}
