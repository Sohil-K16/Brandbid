import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { calculateRankings, getNextRank } from "@/lib/ranking/ranking-engine";
import BrandDetailCard from "@/components/brand/BrandDetailCard";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = db.getBrandBySlug(slug);

  if (!brand || brand.status !== "published") {
    return {
      title: "Brand Not Found — BrandBid.me",
    };
  }

  const allBrands = db.getAllBrands();
  const ranked = calculateRankings(allBrands);
  const rankedBrand = ranked.find((b) => b.id === brand.id);
  const rankNumber = rankedBrand?.rank || "?";

  const formattedBid = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(brand.totalBid);

  return {
    title: `${brand.name} (#${rankNumber}) — BrandBid.me`,
    description: `${brand.name} is ranked #${rankNumber} on BrandBid.me with ${formattedBid} total bid. Category: ${brand.category}.`,
    openGraph: {
      title: `${brand.name} is #${rankNumber} on BrandBid.me`,
      description: `${brand.name} claimed spot #${rankNumber} with ${formattedBid} verified bid. How high can your brand climb?`,
      url: `https://brandbid.me/brand/${brand.slug}`,
      siteName: "BrandBid.me",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${brand.name} is #${rankNumber} on BrandBid.me`,
      description: `Verified bid: ${formattedBid}. See our poster on BrandBid.`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = db.getBrandBySlug(slug);

  if (!brand || brand.status !== "published") {
    notFound();
  }

  const allBrands = db.getAllBrands();
  const ranked = calculateRankings(allBrands);
  const rankedBrand = ranked.find((b) => b.id === brand.id);

  if (!rankedBrand) {
    notFound();
  }

  const climbInfo = getNextRank(brand.id, allBrands);
  const bidHistory = db.getBidHistoryByBrandId(brand.id);

  return (
    <div className="w-full min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-background">
      <BrandDetailCard
        brand={rankedBrand}
        climbInfo={climbInfo}
        bidHistory={bidHistory}
        allRankedBrands={ranked}
      />
    </div>
  );
}
