import React from "react";
import Link from "next/link";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { ArrowUpRight } from "lucide-react";

export interface BoardPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function BoardPoster({ brand }: BoardPosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  return (
    <div className="w-full py-2.5 px-3 bg-white/70 hover:bg-white border border-border/70 hover:border-border rounded flex items-center justify-between gap-3 text-xs transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-mono-num font-semibold text-muted text-[11px] w-7 flex-shrink-0">
          #{brand.rank}
        </span>
        <Link
          href={`/brand/${brand.slug}`}
          className="font-semibold text-foreground hover:underline truncate"
        >
          {brand.name}
        </Link>
        <span className="text-[10px] font-mono-num text-muted hidden sm:inline truncate">
          {brand.category}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="font-mono-num font-medium text-foreground text-[11px]">
          {formattedBid}
        </span>
        <a
          href={brand.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted hover:text-foreground"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
