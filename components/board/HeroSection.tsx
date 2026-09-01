import React from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { ArrowDown, Flame } from "lucide-react";

export interface HeroSectionProps {
  totalBidVolume: number;
  totalBrands: number;
}

export default function HeroSection({
  totalBidVolume,
  totalBrands,
}: HeroSectionProps) {
  const formattedVolume = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(totalBidVolume);

  return (
    <section className="w-full pt-16 pb-12 sm:pt-24 sm:pb-20 text-center px-4 sm:px-6 lg:px-8 border-b border-border bg-[#F7F6F2]">
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
        {/* Top Micro-Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-border rounded text-xs font-mono-num font-semibold uppercase tracking-widest text-muted shadow-subtle">
          <Flame className="w-3.5 h-3.5 text-accent" />
          <span>The Public Competition for Internet Brands</span>
        </div>

        {/* Huge Headline */}
        <h1 className="text-4xl sm:text-7xl md:text-8xl font-black font-display tracking-tight text-foreground uppercase leading-[0.95] select-none">
          HOW HIGH CAN <br className="hidden sm:inline" />
          <span className="text-foreground underline decoration-accent/60 decoration-wavy decoration-2">
            YOUR BRAND
          </span>{" "}
          CLIMB?
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-muted max-w-xl mx-auto font-normal">
          The public leaderboard where websites compete for ranking.{" "}
          <strong className="text-foreground">The more you pay, the higher you rank.</strong>
        </p>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 pt-2 pb-4 font-mono-num text-xs sm:text-sm uppercase tracking-wider text-muted">
          <div className="px-4 py-2 bg-white/80 border border-border rounded">
            <span className="block text-xl sm:text-2xl font-black text-foreground">
              {formattedVolume}
            </span>
            <span className="text-[11px] text-muted">Total Bid Volume</span>
          </div>

          <div className="px-4 py-2 bg-white/80 border border-border rounded">
            <span className="block text-xl sm:text-2xl font-black text-foreground">
              {totalBrands}
            </span>
            <span className="text-[11px] text-muted">Competing Brands</span>
          </div>
        </div>

        {/* CTA & Scroll Indicator */}
        <div className="space-y-4 pt-2">
          <Link href="/claim">
            <Button size="lg" variant="primary" className="font-mono-num px-8 py-4 text-base shadow-md">
              Claim Your Spot →
            </Button>
          </Link>
          <p className="text-xs font-mono-num text-muted">
            Instant placement. No accounts. Verified payments only.
          </p>
        </div>

        {/* Down Arrow */}
        <div className="pt-6 flex justify-center">
          <a
            href="#board"
            className="p-2 text-muted hover:text-foreground transition-colors animate-bounce"
            aria-label="Scroll to leaderboard"
          >
            <ArrowDown className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
