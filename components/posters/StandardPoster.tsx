import React from "react";
import Link from "next/link";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Badge } from "../ui/Badge";
import { ArrowUpRight } from "lucide-react";

export interface StandardPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function StandardPoster({
  brand,
  isStandalone = false,
}: StandardPosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  const rankStr = `#${brand.rank.toString().padStart(2, "0")}`;

  return (
    <div className="w-full bg-white border border-border hover:border-black rounded p-3.5 shadow-sm transition-colors group flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono-num font-bold text-xs sm:text-sm text-black bg-black/5 px-2 py-0.5 rounded flex-shrink-0">
          {rankStr}
        </span>

        <div className="min-w-0">
          <Link
            href={`/brand/${brand.slug}`}
            className="font-bold text-sm font-display uppercase tracking-tight text-foreground hover:text-accent transition-colors truncate block"
          >
            {brand.name}
          </Link>
          <span className="text-[11px] font-mono-num text-muted truncate block">
            {brand.canonicalUrl}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <div className="font-mono-num font-bold text-xs sm:text-sm text-foreground">
            {formattedBid}
          </div>
          <span className="text-[10px] uppercase font-mono-num text-muted">
            {brand.category}
          </span>
        </div>

        <a
          href={brand.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-muted hover:text-foreground transition-colors"
          aria-label={`Visit ${brand.name}`}
        >
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
