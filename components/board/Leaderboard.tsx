"use client";

import React, { useState } from "react";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import BrandPoster from "../posters/BrandPoster";
import CategoryFilter from "./CategoryFilter";
import Link from "next/link";
import { Button } from "../ui/Button";
import { Trophy, Plus } from "lucide-react";

export interface LeaderboardProps {
  initialBrands: RankedBrand[];
}

export default function Leaderboard({ initialBrands }: LeaderboardProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBrands = initialBrands.filter((brand) => {
    const matchesCategory =
      selectedCategory === "All" ||
      brand.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.canonicalUrl.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (brand.description &&
        brand.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const numberOne = filteredBrands.find((b) => b.rank === 1);
  const podiumChallengers = filteredBrands.filter((b) => b.rank === 2 || b.rank === 3);
  const eliteBrands = filteredBrands.filter((b) => b.rank >= 4 && b.rank <= 10);
  const featuredBrands = filteredBrands.filter((b) => b.rank >= 11 && b.rank <= 25);
  const standardBrands = filteredBrands.filter((b) => b.rank >= 26 && b.rank <= 50);
  const boardBrands = filteredBrands.filter((b) => b.rank >= 51);

  return (
    <section id="board" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Board Header & Controls */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-num font-bold uppercase tracking-widest text-muted">
              <Trophy className="w-3.5 h-3.5 text-accent" />
              <span>Official Standings</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black font-display uppercase tracking-tight text-foreground mt-1">
              THE LEADERBOARD
            </h2>
          </div>

          <div className="text-xs font-mono-num text-muted">
            Displaying <strong className="text-foreground">{filteredBrands.length}</strong> verified brands
          </div>
        </div>

        {/* Filters */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {filteredBrands.length === 0 ? (
        <div className="w-full py-16 text-center border border-dashed border-border rounded bg-white/50 space-y-4">
          <p className="text-sm font-mono-num text-muted">
            No brands found matching &ldquo;{searchQuery || selectedCategory}&rdquo;
          </p>
          <Link href="/claim">
            <Button size="sm" variant="primary" className="font-mono-num">
              Be the first to claim this spot →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-12 sm:space-y-16">
          {/* #1 LEGENDARY HERO SPOT */}
          {numberOne && (
            <div className="space-y-3">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E7B93C]" />
                <span>Tier 1 — The Throne</span>
              </div>
              <BrandPoster brand={numberOne} />
            </div>
          )}

          {/* #2 & #3 PODIUM CONTENDERS */}
          {podiumChallengers.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#BFC3C7]" />
                <span>Podium Contenders</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {podiumChallengers.map((brand) => (
                  <BrandPoster key={brand.id} brand={brand} />
                ))}
              </div>
            </div>
          )}

          {/* #4 - 10 ELITE TIER */}
          {eliteBrands.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-black/40" />
                <span>Top 10 Elite</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {eliteBrands.map((brand) => (
                  <BrandPoster key={brand.id} brand={brand} />
                ))}
              </div>
            </div>
          )}

          {/* #11 - 25 FEATURED TIER */}
          {featuredBrands.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold">
                Featured Brands (#11 – #25)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredBrands.map((brand) => (
                  <BrandPoster key={brand.id} brand={brand} />
                ))}
              </div>
            </div>
          )}

          {/* #26 - 50 STANDARD TIER */}
          {standardBrands.length > 0 && (
            <div className="space-y-4">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold">
                Standard Listings (#26 – #50)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {standardBrands.map((brand) => (
                  <BrandPoster key={brand.id} brand={brand} />
                ))}
              </div>
            </div>
          )}

          {/* #51+ BOARD LIST */}
          {boardBrands.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-mono-num uppercase tracking-wider text-muted font-bold">
                Board Entries (#51+)
              </div>
              <div className="space-y-2">
                {boardBrands.map((brand) => (
                  <BrandPoster key={brand.id} brand={brand} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Claim Invitation Banner */}
      <div className="mt-16 p-8 sm:p-12 bg-white border border-border text-center rounded space-y-4">
        <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-tight text-foreground">
          Ready to climb this board?
        </h3>
        <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
          Submit your website, choose your bid, and appear immediately after verified payment.
        </p>
        <div className="pt-2">
          <Link href="/claim">
            <Button size="lg" variant="primary" className="font-mono-num">
              <Plus className="w-4 h-4 mr-1" />
              Claim Your Spot Now →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
