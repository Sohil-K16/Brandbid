import React from "react";
import Link from "next/link";
import Image from "next/image";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Badge } from "../ui/Badge";
import { ExternalLink, ArrowUpRight } from "lucide-react";

export interface ContenderPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function ContenderPoster({
  brand,
  isStandalone = false,
}: ContenderPosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  return (
    <div className="w-full relative group">
      {/* Bronze Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[#B8794B]/20 via-white/30 to-[#B8794B]/20 rounded blur-sm opacity-50 group-hover:opacity-100 transition duration-300 pointer-events-none" />

      {/* Main Container */}
      <div className="relative bg-white border border-[#B8794B]/70 rounded p-6 sm:p-8 md:p-10 shadow-sm transition-all duration-300 group-hover:translate-y-[-2px]">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#B8794B]/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-[#B8794B] text-white font-black text-lg sm:text-xl font-mono-num rounded-sm">
              #03
            </span>
            <span className="text-xs font-mono-num font-bold uppercase tracking-wider text-[#733F17]">
              Contender
            </span>
          </div>

          <Badge variant="category" className="bg-[#F7F6F2] border-border text-foreground">
            {brand.category}
          </Badge>
        </div>

        {/* Body */}
        <div className="py-6 sm:py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8 space-y-3">
            <div className="flex items-center gap-3.5">
              {brand.logoUrl ? (
                <div className="relative w-12 h-12 rounded border border-border overflow-hidden bg-background flex-shrink-0">
                  <Image
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded border border-border bg-background flex items-center justify-center font-display font-bold text-xl text-foreground flex-shrink-0">
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div>
                <h3 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-foreground uppercase leading-none">
                  {brand.name}
                </h3>
                <a
                  href={brand.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono-num text-muted hover:text-foreground mt-1 transition-colors"
                >
                  <span>{brand.canonicalUrl}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {brand.description && (
              <p className="text-sm sm:text-base text-foreground/80 line-clamp-2 pt-1">
                {brand.description}
              </p>
            )}
          </div>

          <div className="md:col-span-4 flex flex-col md:items-end justify-center md:text-right border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
            <span className="text-[11px] uppercase font-mono-num tracking-wider text-muted">
              Total Bid
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono-num text-foreground tracking-tight my-0.5">
              {formattedBid}
            </span>
            <span className="text-[11px] font-mono-num text-muted">
              Bronze Podium Spot
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            href={`/brand/${brand.slug}`}
            className="text-xs font-mono-num text-muted hover:text-foreground transition-colors"
          >
            View detail & climb →
          </Link>

          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono-num uppercase tracking-wider text-foreground hover:underline"
          >
            <span>Visit</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
