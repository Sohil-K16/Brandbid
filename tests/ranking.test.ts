import { describe, it, expect } from "vitest";
import {
  calculateRankings,
  getPosterTier,
  estimateRankForBid,
  getNextRank,
} from "../lib/ranking/ranking-engine";
import { Brand } from "../lib/db/schema";

describe("Ranking Engine", () => {
  const mockBrands: Brand[] = [
    {
      id: "brand-1",
      name: "Acme AI",
      websiteUrl: "https://acme.ai",
      canonicalUrl: "acme.ai",
      slug: "acme-ai",
      category: "AI",
      logoUrl: null,
      description: "AI powerhouse",
      tagline: null,
      totalBid: 50000,
      status: "published",
      managementTokenHash: "hash1",
      template: "typography",
      clickCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "brand-2",
      name: "Nova Dev",
      websiteUrl: "https://nova.dev",
      canonicalUrl: "nova.dev",
      slug: "nova-dev",
      category: "Developer Tools",
      logoUrl: null,
      description: "Fast dev tools",
      tagline: null,
      totalBid: 32000,
      status: "published",
      managementTokenHash: "hash2",
      template: "editorial",
      clickCount: 0,
      createdAt: "2026-01-02T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "brand-3",
      name: "Orbit SaaS",
      websiteUrl: "https://orbit.io",
      canonicalUrl: "orbit.io",
      slug: "orbit-saas",
      category: "SaaS",
      logoUrl: null,
      description: "Collaborative SaaS",
      tagline: null,
      totalBid: 21500,
      status: "published",
      managementTokenHash: "hash3",
      template: "minimal",
      clickCount: 0,
      createdAt: "2026-01-03T00:00:00.000Z",
      updatedAt: "2026-01-03T00:00:00.000Z",
    },
  ];

  it("ranks brands strictly by total verified bid in descending order", () => {
    const ranked = calculateRankings(mockBrands);
    expect(ranked).toHaveLength(3);
    expect(ranked[0].name).toBe("Acme AI");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].tier).toBe("legendary");

    expect(ranked[1].name).toBe("Nova Dev");
    expect(ranked[1].rank).toBe(2);
    expect(ranked[1].tier).toBe("challenger");

    expect(ranked[2].name).toBe("Orbit SaaS");
    expect(ranked[2].rank).toBe(3);
    expect(ranked[2].tier).toBe("contender");
  });

  it("handles deterministic tie-breaking (earlier created brand gets higher position)", () => {
    const tiedBrands: Brand[] = [
      {
        id: "brand-late",
        name: "Late Brand",
        websiteUrl: "https://late.com",
        canonicalUrl: "late.com",
        slug: "late",
        category: "SaaS",
        logoUrl: null,
        description: null,
        tagline: null,
        totalBid: 10000,
        status: "published",
        managementTokenHash: "hash_late",
        template: "typography",
        clickCount: 0,
        createdAt: "2026-02-15T12:00:00.000Z",
        updatedAt: "2026-02-15T12:00:00.000Z",
      },
      {
        id: "brand-early",
        name: "Early Brand",
        websiteUrl: "https://early.com",
        canonicalUrl: "early.com",
        slug: "early",
        category: "SaaS",
        logoUrl: null,
        description: null,
        tagline: null,
        totalBid: 10000,
        status: "published",
        managementTokenHash: "hash_early",
        template: "typography",
        clickCount: 0,
        createdAt: "2026-01-10T12:00:00.000Z",
        updatedAt: "2026-01-10T12:00:00.000Z",
      },
    ];

    const ranked = calculateRankings(tiedBrands);
    expect(ranked[0].name).toBe("Early Brand");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].name).toBe("Late Brand");
    expect(ranked[1].rank).toBe(2);
  });

  it("assigns proper poster tiers based on rank numbers", () => {
    expect(getPosterTier(1)).toBe("legendary");
    expect(getPosterTier(2)).toBe("challenger");
    expect(getPosterTier(3)).toBe("contender");
    expect(getPosterTier(4)).toBe("elite");
    expect(getPosterTier(10)).toBe("elite");
    expect(getPosterTier(11)).toBe("featured");
    expect(getPosterTier(25)).toBe("featured");
    expect(getPosterTier(26)).toBe("standard");
    expect(getPosterTier(50)).toBe("standard");
    expect(getPosterTier(51)).toBe("board");
    expect(getPosterTier(100)).toBe("board");
  });

  it("estimates prospective rank accurately for a new bid", () => {
    // Current highest is Acme (50k), Nova (32k), Orbit (21.5k)
    // A bid of 35k should land at #2
    const estimate = estimateRankForBid(35000, mockBrands);
    expect(estimate.estimatedRank).toBe(2);
    expect(estimate.tier).toBe("challenger");
    expect(estimate.isNumberOne).toBe(false);

    // A bid of 60k should land at #1
    const estimateNo1 = estimateRankForBid(60000, mockBrands);
    expect(estimateNo1.estimatedRank).toBe(1);
    expect(estimateNo1.tier).toBe("legendary");
    expect(estimateNo1.isNumberOne).toBe(true);

    // A bid of 10k should land at #4
    const estimateLow = estimateRankForBid(10000, mockBrands);
    expect(estimateLow.estimatedRank).toBe(4);
  });

  it("calculates next rank climb gap accurately", () => {
    // Nova is #2 with 32,000. Acme is #1 with 50,000.
    // Nova needs (50,000 - 32,000 + 1) = 18,001 to take #1.
    const climbInfo = getNextRank("brand-2", mockBrands);
    expect(climbInfo).not.toBeNull();
    expect(climbInfo?.currentRank).toBe(2);
    expect(climbInfo?.nextRank).toBe(1);
    expect(climbInfo?.gap).toBe(18001);
    expect(climbInfo?.nextBrandName).toBe("Acme AI");
  });
});
