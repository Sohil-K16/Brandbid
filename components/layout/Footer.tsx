import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-[#F7F6F2] py-12 md:py-16 text-center text-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Core Manifesto Quote */}
        <div className="space-y-2">
          <p className="font-display text-lg sm:text-2xl font-bold tracking-tight text-foreground uppercase">
            HOW HIGH CAN YOUR BRAND CLIMB?
          </p>
          <p className="text-xs sm:text-sm max-w-md mx-auto">
            A public leaderboard where websites compete for ranking based on verified payments.
          </p>
        </div>

        {/* Navigation & Links */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs font-mono-num uppercase tracking-wider">
          <Link href="/" className="hover:text-foreground transition-colors">
            Leaderboard
          </Link>
          <Link href="/claim" className="hover:text-foreground transition-colors">
            Claim Spot
          </Link>
          <Link href="/admin" className="hover:text-foreground transition-colors">
            Admin Panel
          </Link>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Share on X
          </a>
        </div>

        {/* Bottom copyright & integrity badge */}
        <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-num gap-3">
          <p>© {new Date().getFullYear()} BrandBid.me — All rights reserved.</p>
          <p className="text-muted/80">
            Rule #1: Higher verified payment = Higher leaderboard rank.
          </p>
        </div>
      </div>
    </footer>
  );
}
