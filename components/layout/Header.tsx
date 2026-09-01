"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/Button";

export default function Header() {
  const pathname = usePathname();
  const isClaimPage = pathname === "/claim";

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F7F6F2]/90 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="group flex items-center gap-2 font-display text-lg sm:text-xl font-bold tracking-tighter uppercase select-none hover:opacity-80 transition-opacity"
        >
          <span className="bg-foreground text-background px-1.5 py-0.5 rounded-sm text-xs font-mono-num font-extrabold">
            BB
          </span>
          <span className="tracking-tight text-foreground">BRANDBID<span className="text-accent font-mono-num">.ME</span></span>
        </Link>

        {/* Right CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/#board"
            className="text-xs font-mono-num uppercase tracking-wider text-muted hover:text-foreground hidden sm:inline-block transition-colors"
          >
            Board
          </Link>
          <Link
            href="/admin"
            className="text-xs font-mono-num uppercase tracking-wider text-muted hover:text-foreground hidden sm:inline-block transition-colors"
          >
            Admin
          </Link>
          {!isClaimPage && (
            <Link href="/claim">
              <Button size="sm" variant="primary" className="font-mono-num">
                Claim Your Spot →
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
