import { describe, it, expect, beforeAll, vi } from "vitest";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import * as dodoModule from "../lib/payments/dodo";
import { POST as handleMetadata } from "../app/api/metadata/route";
import { POST as handleCreatePayment } from "../app/api/payments/create/route";
import { POST as handleWebhook } from "../app/api/payments/webhook/route";
import { GET as handleStatus } from "../app/api/payments/status/route";
import { GET as handleLeaderboard } from "../app/api/leaderboard/route";
import { GET as handleBrandPage } from "../app/api/brands/[slug]/route";
import { GET as handleManage } from "../app/api/manage/[token]/route";
import { GET as handleAdminStats } from "../app/api/admin/stats/route";

const { mockClient } = vi.hoisted(() => {
  return {
    mockClient: {
      checkoutSessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
      webhooks: {
        unwrap: vi.fn(),
      },
    },
  };
});

vi.mock("dodopayments", () => {
  return {
    default: vi.fn().mockImplementation(() => mockClient),
    DodoPayments: vi.fn().mockImplementation(() => mockClient),
  };
});

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
    const metaReq = new Request(`${baseUrl}/api/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://linear.app" }),
    });
    const metaRes = await handleMetadata(metaReq);
    const metaJson = await metaRes.json();
    expect(metaJson.success).toBe(true);
    expect(metaJson.data.domain).toBe("linear.app");

    // Step B: Submit Claim & Create Real Dodo Payment Order
    mockClient.checkoutSessions.create.mockResolvedValueOnce({
      session_id: "cks_e2e_linear_session",
      checkout_url: "https://test.dodopayments.com/buy/cks_e2e_linear_session",
    });

    const claimReq = new Request(`${baseUrl}/api/payments/create`, {
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
    const claimRes = await handleCreatePayment(claimReq);
    const claimJson = await claimRes.json();
    expect(claimJson.success).toBe(true);
    expect(claimJson.data.sessionId).toBe("cks_e2e_linear_session");
    expect(claimJson.data.checkoutUrl).toBe(
      "https://test.dodopayments.com/buy/cks_e2e_linear_session"
    );
    expect(claimJson.data.managementToken).toBeDefined();
    expect(claimJson.data.paymentAttemptId).toBeDefined();

    const { sessionId, brandId, managementToken } = claimJson.data;

    // Step C: Payment Fulfillment via Verified Dodo Webhook (Source of Truth)
    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_e2e_linear_payment",
        session_id: sessionId,
        total_amount: 1500000, // $15,000 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId,
          brandName: "Linear App",
          paymentAttemptId: claimJson.data.paymentAttemptId,
          isRebid: "false",
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);

    const webhookReq = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_e2e_linear_123",
        "webhook-signature": "v1,valid_test_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });
    const webhookRes = await handleWebhook(webhookReq as any);
    const webhookJson = await webhookRes.json();
    expect(webhookJson.received).toBe(true);
    expect(webhookJson.amount).toBe(15000);

    // Step C2: Query Read-Only Payment & Brand Status
    const statusReq = new Request(`${baseUrl}/api/payments/status?session_id=${sessionId}&brand_id=${brandId}`);
    const statusRes = await handleStatus(statusReq as any);
    const statusJson = await statusRes.json();
    expect(statusJson.success).toBe(true);
    expect(statusJson.data.isVerified).toBe(true);
    expect(statusJson.data.rank).toBe(1); // Linear is now #1!
    expect(statusJson.data.isNumberOne).toBe(true);

    // Step D: Verify Leaderboard Reflection
    const boardReq = new Request(`${baseUrl}/api/leaderboard`);
    const boardRes = await handleLeaderboard(boardReq);
    const boardJson = await boardRes.json();
    expect(boardJson.success).toBe(true);
    expect(boardJson.data.brands[0].name).toBe("Linear App");
    expect(boardJson.data.brands[0].rank).toBe(1);
    expect(boardJson.data.brands[0].tier).toBe("legendary");
    expect(boardJson.data.brands[1].name).toBe("Synthetix AI");
    expect(boardJson.data.brands[1].rank).toBe(2);

    // Step E: Public Brand Page API
    const brandPageReq = new Request(`${baseUrl}/api/brands/linear-app`);
    const brandPageRes = await handleBrandPage(brandPageReq, {
      params: Promise.resolve({ slug: "linear-app" }),
    });
    const brandPageJson = await brandPageRes.json();
    expect(brandPageJson.success).toBe(true);
    expect(brandPageJson.data.brand.rank).toBe(1);
    expect(brandPageJson.data.brand.totalBid).toBe(15000);

    // Step F: Tokenized Management API
    const manageReq = new Request(`${baseUrl}/api/manage/${managementToken}`);
    const manageRes = await handleManage(manageReq, {
      params: Promise.resolve({ token: managementToken }),
    });
    const manageJson = await manageRes.json();
    expect(manageJson.success).toBe(true);
    expect(manageJson.data.brand.name).toBe("Linear App");
    expect(manageJson.data.rank).toBe(1);

    // Step G: Admin Dashboard API
    const adminReq = new Request(
      `${baseUrl}/api/admin/stats?secret=brandbid_admin_super_secret_key_2026`
    );
    const adminRes = await handleAdminStats(adminReq);
    const adminJson = await adminRes.json();
    expect(adminJson.success).toBe(true);
    expect(adminJson.data.stats.totalBrands).toBeGreaterThanOrEqual(27);
  });
});
