import React from "react";
import { RankedBrand } from "@/lib/ranking/ranking-engine";
import LegendaryPoster from "./LegendaryPoster";
import ChallengerPoster from "./ChallengerPoster";
import ContenderPoster from "./ContenderPoster";
import ElitePoster from "./ElitePoster";
import FeaturedPoster from "./FeaturedPoster";
import StandardPoster from "./StandardPoster";
import BoardPoster from "./BoardPoster";

export interface BrandPosterProps {
  brand: RankedBrand;
  isStandalone?: boolean;
}

export default function BrandPoster({ brand, isStandalone = false }: BrandPosterProps) {
  if (brand.rank === 1) {
    return <LegendaryPoster brand={brand} isStandalone={isStandalone} />;
  }
  if (brand.rank === 2) {
    return <ChallengerPoster brand={brand} isStandalone={isStandalone} />;
  }
  if (brand.rank === 3) {
    return <ContenderPoster brand={brand} isStandalone={isStandalone} />;
  }
  if (brand.rank >= 4 && brand.rank <= 10) {
    return <ElitePoster brand={brand} isStandalone={isStandalone} />;
  }
  if (brand.rank >= 11 && brand.rank <= 25) {
    return <FeaturedPoster brand={brand} isStandalone={isStandalone} />;
  }
  if (brand.rank >= 26 && brand.rank <= 50) {
    return <StandardPoster brand={brand} isStandalone={isStandalone} />;
  }
  return <BoardPoster brand={brand} isStandalone={isStandalone} />;
}
