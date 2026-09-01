"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RankedBrand, NextRankInfo } from "@/lib/ranking/ranking-engine";
import { BidHistoryItem } from "@/lib/db";
import { Badge } from "../ui/Badge";
import ClimbWidget from "./ClimbWidget";
import ShareButtons from "./ShareButtons";
import RebidModal from "./RebidModal";
import { ExternalLink, ArrowUpRight, History } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";

export interface BrandDetailCardProps {
  brand: RankedBrand;
  climbInfo: NextRankInfo | null;
  bidHistory: BidHistoryItem[];
  allRankedBrands: RankedBrand[];
}

export default function BrandDetailCard({
  brand,
  climbInfo,
  bidHistory,
  allRankedBrands,
}: BrandDetailCardProps) {
  const [isRebidOpen, setIsRebidOpen] = useState(false);

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  const handleWebsiteClick = () => {
    trackEvent("website_clicked", { brand: brand.name, url: brand.websiteUrl });
    fetch(`/api/brands/${brand.slug}`, { method: "POST" }).catch(() => {});
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between text-xs font-mono-num text-muted border-b border-border pb-4">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to Leaderboard
        </Link>
        <span>Brand Listing #{brand.rank}</span>
      </div>

      {/* Hero Poster Presentation Card */}
      <div
        className={`w-full bg-white border-2 rounded p-8 sm:p-14 space-y-8 shadow-sm transition-all ${
          brand.rank === 1
            ? "border-[#E7B93C] shadow-gold"
            : brand.rank === 2
            ? "border-[#BFC3C7] shadow-silver"
            : brand.rank === 3
            ? "border-[#B8794B] shadow-bronze"
            : "border-black"
        }`}
      >
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center justify-center w-12 h-12 font-black text-2xl font-mono-num rounded ${
                brand.rank === 1
                  ? "bg-[#E7B93C] text-black"
                  : brand.rank === 2
                  ? "bg-[#BFC3C7] text-black"
                  : brand.rank === 3
                  ? "bg-[#B8794B] text-white"
                  : "bg-black text-white"
              }`}
            >
              #{brand.rank.toString().padStart(2, "0")}
            </span>
            <span className="text-xs font-mono-num font-bold uppercase tracking-wider text-muted">
              {brand.rank === 1
                ? "Legendary (#1 On Top)"
                : brand.rank === 2
                ? "Challenger (#2)"
                : brand.rank === 3
                ? "Contender (#3)"
                : "Official Ranked Brand"}
            </span>
          </div>

          <Badge variant="category" className="text-xs">
            {brand.category}
          </Badge>
        </div>

        {/* Poster Core */}
        <div className="py-6 sm:py-10 space-y-6 text-center">
          {brand.logoUrl ? (
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded border border-border overflow-hidden bg-background shadow-sm">
              <Image
                src={brand.logoUrl}
                alt={`${brand.name} logo`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded border border-border bg-background flex items-center justify-center font-display font-black text-3xl text-foreground">
              {brand.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-display uppercase tracking-tight text-foreground leading-none">
              {brand.name}
            </h1>
            {brand.tagline && (
              <p className="text-sm sm:text-base font-mono-num font-bold text-muted uppercase tracking-wider">
                {brand.tagline}
              </p>
            )}
          </div>

          {brand.description && (
            <p className="text-base sm:text-lg text-foreground/80 max-w-xl mx-auto leading-relaxed">
              {brand.description}
            </p>
          )}

          {/* Amount Paid */}
          <div className="pt-4">
            <span className="text-xs uppercase font-mono-num text-muted tracking-wider block">
              Total Verified Paid Amount
            </span>
            <span className="text-4xl sm:text-6xl font-black font-mono-num text-foreground tracking-tight block my-1">
              {formattedBid}
            </span>
          </div>

          {/* Visit Website CTA */}
          <div className="pt-6">
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWebsiteClick}
              className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background text-sm font-mono-num font-bold uppercase tracking-wider rounded hover:bg-black transition-colors shadow-md"
            >
              <span>Visit Website</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Share Section */}
        <div className="pt-8 border-t border-border space-y-4 text-center">
          <span className="text-xs uppercase font-mono-num tracking-wider text-muted block">
            Share this ranking & poster
          </span>
          <ShareButtons brand={brand} />
        </div>
      </div>

      {/* Climb / Rebid Widget */}
      <ClimbWidget
        brand={brand}
        climbInfo={climbInfo}
        onOpenRebid={() => setIsRebidOpen(true)}
      />

      {/* Bid History Audit Log */}
      {bidHistory && bidHistory.length > 0 && (
        <div className="bg-white border border-border rounded p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono-num font-bold uppercase tracking-wider text-muted">
            <History className="w-4 h-4" />
            <span>Verified Bid History</span>
          </div>

          <div className="divide-y divide-border/60">
            {bidHistory.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between text-xs font-mono-num"
              >
                <div>
                  <span className="font-bold text-foreground">
                    +${item.amountAdded.toLocaleString("en-US")}
                  </span>
                  <span className="text-muted ml-2">
                    (Total: ${item.newTotal.toLocaleString("en-US")})
                  </span>
                </div>
                <div className="text-muted text-[11px]">
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rebid Modal */}
      <RebidModal
        isOpen={isRebidOpen}
        onClose={() => setIsRebidOpen(false)}
        brand={brand}
        existingBrands={allRankedBrands}
        onSuccess={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
