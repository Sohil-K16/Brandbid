import { Brand } from "../db/schema";

export type PosterTier =
  | "legendary"   // #1
  | "challenger"  // #2
  | "contender"   // #3
  | "elite"       // #4-10
  | "featured"    // #11-25
  | "standard"    // #26-50
  | "board";      // #51+

export interface RankedBrand extends Brand {
  rank: number;
  tier: PosterTier;
}

export interface NextRankInfo {
  currentRank: number;
  nextRank: number;
  nextRankBid: number;
  gap: number; // Bid amount needed to climb: (nextRankBid - currentBid + 1) or minimum step
  nextBrandName?: string;
}

export interface RankEstimate {
  estimatedRank: number;
  tier: PosterTier;
  aheadOfCount: number;
  totalBrands: number;
  isNumberOne: boolean;
}

/**
 * Returns the PosterTier based on numeric rank.
 */
export function getPosterTier(rank: number): PosterTier {
  if (rank === 1) return "legendary";
  if (rank === 2) return "challenger";
  if (rank === 3) return "contender";
  if (rank >= 4 && rank <= 10) return "elite";
  if (rank >= 11 && rank <= 25) return "featured";
  if (rank >= 26 && rank <= 50) return "standard";
  return "board";
}

/**
 * Deterministic ranking calculation.
 * Sort order:
 * 1. totalBid DESC (higher bid = higher rank)
 * 2. createdAt ASC (earlier created/verified wins tie-breaks)
 */
export function calculateRankings(brandsList: Brand[]): RankedBrand[] {
  // Filter active published brands
  const active = brandsList.filter((b) => b.status === "published" && b.totalBid > 0);

  // Deterministic sort
  active.sort((a, b) => {
    // 1. Compare total bids
    if (b.totalBid !== a.totalBid) {
      return b.totalBid - a.totalBid;
    }
    // 2. Deterministic tie-breaker: earlier creation date wins
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  return active.map((brand, index) => {
    const rank = index + 1;
    return {
      ...brand,
      rank,
      tier: getPosterTier(rank),
    };
  });
}

/**
 * Calculates what rank a new or increased bid will land at.
 */
export function estimateRankForBid(
  bidAmount: number,
  existingBrands: Brand[],
  currentBrandId?: string
): RankEstimate {
  // If editing an existing brand, filter it out from other competitors
  const competitors = existingBrands.filter(
    (b) => b.status === "published" && b.id !== currentBrandId && b.totalBid > 0
  );

  // Count how many competitors have a higher bid
  // Note: For a brand tying with existing competitors, existing competitors won their bid earlier,
  // so existing tied competitors rank ahead.
  let rank = 1;
  for (const comp of competitors) {
    if (comp.totalBid >= bidAmount) {
      rank++;
    }
  }

  const totalBrands = competitors.length + 1;
  const aheadOfCount = totalBrands - rank;

  return {
    estimatedRank: rank,
    tier: getPosterTier(rank),
    aheadOfCount,
    totalBrands,
    isNumberOne: rank === 1,
  };
}

/**
 * Calculates distance to the next spot for the "Want to climb?" feature.
 */
export function getNextRank(
  currentBrandId: string,
  allBrands: Brand[]
): NextRankInfo | null {
  const ranked = calculateRankings(allBrands);
  const currentIdx = ranked.findIndex((b) => b.id === currentBrandId);

  if (currentIdx === -1) return null;

  const current = ranked[currentIdx];
  if (current.rank === 1) {
    return {
      currentRank: 1,
      nextRank: 1,
      nextRankBid: current.totalBid,
      gap: 0,
    };
  }

  const target = ranked[currentIdx - 1]; // Brand immediately ahead
  // To beat target who has target.totalBid, we need at least (target.totalBid - current.totalBid + 1)
  const gap = Math.max(1, target.totalBid - current.totalBid + 1);

  return {
    currentRank: current.rank,
    nextRank: target.rank,
    nextRankBid: target.totalBid,
    gap,
    nextBrandName: target.name,
  };
}
