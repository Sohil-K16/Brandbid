import React from "react";
import Link from "next/link";
import Image from "next/image";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Badge } from "../ui/Badge";
import { Crown, ExternalLink, ArrowUpRight } from "lucide-react";

export interface LegendaryPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function LegendaryPoster({
  brand,
  isStandalone = false,
}: LegendaryPosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  return (
    <div className="w-full relative group">
      {/* Gold Ambient Glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-[#E7B93C]/40 via-[#FDF4DB]/60 to-[#E7B93C]/40 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition duration-500 pointer-events-none" />

      {/* Main Poster Container */}
      <div className="relative bg-white border-2 border-[#E7B93C] rounded shadow-gold p-6 sm:p-10 md:p-14 transition-all duration-300 group-hover:translate-y-[-2px]">
        {/* Top Bar: Rank & Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E7B93C]/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#E7B93C] text-black font-black text-xl sm:text-2xl font-mono-num rounded-sm shadow-sm">
              #01
            </span>
            <div className="flex items-center gap-1.5 bg-[#E7B93C]/20 border border-[#E7B93C] text-[#8F6A00] px-3 py-1 rounded text-xs font-mono-num font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 text-[#B88E18]" />
              <span>Currently on Top</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="category" className="bg-[#F7F6F2] border-border text-foreground">
              {brand.category}
            </Badge>
          </div>
        </div>

        {/* Poster Body */}
        <div className="py-8 sm:py-12 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Brand Details */}
          <div className="md:col-span-8 space-y-4">
            <div className="flex items-center gap-4">
              {brand.logoUrl ? (
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded border border-border/80 overflow-hidden bg-background flex-shrink-0 shadow-sm">
                  <Image
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded border border-border/80 bg-background flex items-center justify-center font-display font-bold text-2xl text-foreground flex-shrink-0">
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black font-display tracking-tight text-foreground uppercase leading-none">
                  {brand.name}
                </h2>
                <a
                  href={brand.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-mono-num text-muted hover:text-foreground mt-1 transition-colors"
                >
                  <span>{brand.canonicalUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {brand.description && (
              <p className="text-base sm:text-lg text-foreground/80 font-normal max-w-xl leading-relaxed pt-2">
                {brand.description}
              </p>
            )}
          </div>

          {/* Bid Amount Display */}
          <div className="md:col-span-4 flex flex-col md:items-end justify-center md:text-right border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
            <span className="text-xs uppercase font-mono-num tracking-wider text-muted">
              Total Verified Bid
            </span>
            <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono-num text-foreground tracking-tight my-1">
              {formattedBid}
            </span>
            <span className="text-[11px] font-mono-num text-muted">
              Undisputed #1 Position
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-mono-num text-muted">
            <span className="text-black font-bold">1st Place</span> — Crowned by highest bid
          </div>

          <div className="flex items-center gap-3">
            <a
              href={brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white text-xs font-mono-num uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors"
            >
              <span>Visit Website</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {!isStandalone && (
              <Link
                href={`/brand/${brand.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-mono-num uppercase tracking-wider rounded hover:bg-black/5 transition-colors"
              >
                <span>View Poster Page</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
