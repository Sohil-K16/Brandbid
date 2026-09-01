import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

describe("BrandBid End-to-End Core User Journey", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  it("1. Loads active leaderboard with correct #1, total bids and rankings", async () => {
    const brands = db.getPublishedBrands();
    expect(brands.length).toBeGreaterThanOrEqual(20);

    // Verify #1 is Synthetix AI
    const highestBidBrand = [...brands].sort((a, b) => b.totalBid - a.totalBid)[0];
    expect(highestBidBrand.name).toBe("Synthetix AI");
    expect(highestBidBrand.totalBid).toBe(10000);
  });

  it("2. Complete Claim Flow: URL -> Metadata -> Order -> Verification -> Instant #1 Placement", async () => {
    const baseUrl = "http://localhost:3000";

    // Step A: Extract Metadata
    const metaRes = await fetch(`${baseUrl}/api/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://linear.app" }),
    });
    const metaJson = await metaRes.json();
    expect(metaJson.success).toBe(true);
    expect(metaJson.data.domain).toBe("linear.app");

    // Step B: Submit Claim & Create Payment Order
    const claimRes = await fetch(`${baseUrl}/api/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteUrl: "https://linear.app",
        name: "Linear App",
        category: "Developer Tools",
        bidAmount: 15000, // $15,000 to overtake Synthetix AI for #1
        description: "The issue tracking tool you'll actually enjoy using.",
        tagline: "Issue Tracking for High-Performance Teams",
        template: "typography",
      }),
    });
    const claimJson = await claimRes.json();
    expect(claimJson.success).toBe(true);
    expect(claimJson.data.orderId).toBeDefined();
    expect(claimJson.data.managementToken).toBeDefined();
    expect(claimJson.data.amount).toBe(15000);

    const { orderId, brandId, managementToken } = claimJson.data;

    // Step C: Verify Payment Server-side
    const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId,
        razorpayOrderId: orderId,
        razorpayPaymentId: "pay_e2e_test_linear_" + Date.now(),
        razorpaySignature: "mock_sig_linear_test",
        amount: 15000,
        managementToken,
      }),
    });
    const verifyJson = await verifyRes.json();
    expect(verifyJson.success).toBe(true);
    expect(verifyJson.data.rank).toBe(1); // Linear is now #1!
    expect(verifyJson.data.isNumberOne).toBe(true);

    // Step D: Verify Leaderboard Reflection
    const boardRes = await fetch(`${baseUrl}/api/leaderboard`);
    const boardJson = await boardRes.json();
    expect(boardJson.success).toBe(true);
    expect(boardJson.data.brands[0].name).toBe("Linear App");
    expect(boardJson.data.brands[0].rank).toBe(1);
    expect(boardJson.data.brands[0].tier).toBe("legendary");
    expect(boardJson.data.brands[1].name).toBe("Synthetix AI");
    expect(boardJson.data.brands[1].rank).toBe(2);

    // Step E: Public Brand Page API
    const brandPageRes = await fetch(`${baseUrl}/api/brands/linear-app`);
    const brandPageJson = await brandPageRes.json();
    expect(brandPageJson.success).toBe(true);
    expect(brandPageJson.data.brand.rank).toBe(1);
    expect(brandPageJson.data.brand.totalBid).toBe(15000);

    // Step F: Tokenized Management API
    const manageRes = await fetch(`${baseUrl}/api/manage/${managementToken}`);
    const manageJson = await manageRes.json();
    expect(manageJson.success).toBe(true);
    expect(manageJson.data.brand.name).toBe("Linear App");
    expect(manageJson.data.rank).toBe(1);

    // Step G: Admin Dashboard API
    const adminRes = await fetch(`${baseUrl}/api/admin/stats?secret=brandbid_admin_super_secret_key_2026`);
    const adminJson = await adminRes.json();
    expect(adminJson.success).toBe(true);
    expect(adminJson.data.stats.totalBrands).toBeGreaterThanOrEqual(27);
  });
});
