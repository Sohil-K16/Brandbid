import React from "react";
import Link from "next/link";
import Image from "next/image";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Badge } from "../ui/Badge";
import { ExternalLink, ArrowUpRight } from "lucide-react";

export interface ElitePosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function ElitePoster({
  brand,
  isStandalone = false,
}: ElitePosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  const rankStr = `#${brand.rank.toString().padStart(2, "0")}`;

  // Template A: Typography Dominant
  if (brand.template === "typography") {
    return (
      <div className="w-full bg-white border border-border hover:border-black rounded p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono-num font-bold text-lg sm:text-xl text-black bg-black/5 px-2 py-0.5 rounded">
                {rankStr}
              </span>
              <Badge variant="category">{brand.category}</Badge>
            </div>
            <span className="font-mono-num font-extrabold text-base sm:text-lg text-foreground">
              {formattedBid}
            </span>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-2.5">
              {brand.logoUrl && (
                <div className="relative w-8 h-8 rounded border border-border overflow-hidden bg-background flex-shrink-0">
                  <Image src={brand.logoUrl} alt={brand.name} fill className="object-cover" unoptimized />
                </div>
              )}
              <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight uppercase group-hover:text-accent transition-colors">
                {brand.name}
              </h3>
            </div>

            {brand.tagline && (
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted/90 pt-1">
                {brand.tagline}
              </p>
            )}

            {brand.description && (
              <p className="text-xs sm:text-sm text-foreground/75 line-clamp-2">
                {brand.description}
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-border/80 flex items-center justify-between text-xs font-mono-num">
          <Link href={`/brand/${brand.slug}`} className="text-muted hover:text-black transition-colors">
            {brand.canonicalUrl}
          </Link>
          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground hover:underline uppercase tracking-wider"
          >
            <span>Visit</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Template B: Logo Dominant / Editorial
  return (
    <div className="w-full bg-white border border-border hover:border-black rounded p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
          <span className="font-mono-num font-bold text-lg sm:text-xl text-black bg-black/5 px-2 py-0.5 rounded">
            {rankStr}
          </span>
          <Badge variant="category">{brand.category}</Badge>
        </div>

        <div className="py-4 flex items-center gap-4">
          {brand.logoUrl ? (
            <div className="relative w-14 h-14 rounded border border-border overflow-hidden bg-background flex-shrink-0">
              <Image src={brand.logoUrl} alt={brand.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-14 h-14 rounded border border-border bg-background flex items-center justify-center font-display font-bold text-lg text-foreground flex-shrink-0">
              {brand.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight uppercase group-hover:text-accent transition-colors">
              {brand.name}
            </h3>
            <span className="font-mono-num font-extrabold text-base text-foreground block mt-0.5">
              {formattedBid}
            </span>
          </div>
        </div>

        {brand.description && (
          <p className="text-xs sm:text-sm text-foreground/75 line-clamp-2">
            {brand.description}
          </p>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-border/80 flex items-center justify-between text-xs font-mono-num">
        <Link href={`/brand/${brand.slug}`} className="text-muted hover:text-black transition-colors">
          {brand.canonicalUrl}
        </Link>
        <a
          href={brand.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-foreground hover:underline uppercase tracking-wider"
        >
          <span>Visit</span>
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
