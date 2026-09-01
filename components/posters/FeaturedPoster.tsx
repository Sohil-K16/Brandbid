import React from "react";
import Link from "next/link";
import Image from "next/image";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import { Badge } from "../ui/Badge";
import { ArrowUpRight } from "lucide-react";

export interface FeaturedPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function FeaturedPoster({
  brand,
  isStandalone = false,
}: FeaturedPosterProps) {
  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  const rankStr = `#${brand.rank.toString().padStart(2, "0")}`;

  return (
    <div className="w-full bg-white border border-border hover:border-black rounded p-5 shadow-sm hover:shadow transition-all duration-150 group flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
          <span className="font-mono-num font-bold text-sm sm:text-base text-black bg-black/5 px-2 py-0.5 rounded">
            {rankStr}
          </span>
          <Badge variant="category" className="text-[10px]">{brand.category}</Badge>
        </div>

        <div className="pt-3.5 space-y-1.5">
          <div className="flex items-center gap-2.5">
            {brand.logoUrl && (
              <div className="relative w-6 h-6 rounded border border-border overflow-hidden bg-background flex-shrink-0">
                <Image src={brand.logoUrl} alt={brand.name} fill className="object-cover" unoptimized />
              </div>
            )}
            <h4 className="text-lg font-bold font-display tracking-tight uppercase group-hover:text-accent transition-colors truncate">
              {brand.name}
            </h4>
          </div>

          <div className="font-mono-num font-bold text-sm text-foreground">
            {formattedBid}
          </div>

          {brand.description && (
            <p className="text-xs text-foreground/70 line-clamp-2 pt-0.5">
              {brand.description}
            </p>
          )}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono-num">
        <Link href={`/brand/${brand.slug}`} className="text-muted hover:text-black transition-colors truncate max-w-[140px]">
          {brand.canonicalUrl}
        </Link>
        <a
          href={brand.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-foreground hover:underline uppercase"
        >
          <span>Visit</span>
          <ArrowUpRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
