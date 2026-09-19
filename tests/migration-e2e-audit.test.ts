import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import { POST as handleCreatePayment } from "../app/api/payments/create/route";
import { POST as handleIncreaseBid } from "../app/api/bids/increase/route";
import { POST as handleWebhook } from "../app/api/payments/webhook/route";
import { GET as handleStatus } from "../app/api/payments/status/route";
import { GET as handleLeaderboard } from "../app/api/leaderboard/route";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";

// Hoist mock client for Dodo Payments SDK
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

describe("Complete End-to-End Audit: BrandBid Dodo Payments Migration", () => {
  const baseUrl = "http://localhost:3000";

  beforeEach(async () => {
    vi.clearAllMocks();
    await seedDatabase();
  });

  // ===========================================================================
  // CASE 1 — New brand complete 11-step lifecycle
  // ===========================================================================
  it("CASE 1 — New brand: end-to-end placement via verified Dodo checkout & webhook", async () => {
    const brandPayload = {
      websiteUrl: "https://acme-analytics.io",
      name: "Acme Analytics",
      category: "Developer Tools",
      bidAmount: 12000, // $12,000 to place near #1
      description: "Next-generation analytics engine.",
      tagline: "Speed meets clarity",
      template: "editorial",
    };

    // 1. Dodo checkout mock setup
    mockClient.checkoutSessions.create.mockResolvedValueOnce({
      session_id: "cks_case1_acme",
      checkout_url: "https://test.dodopayments.com/buy/cks_case1_acme",
    });

    // 2. Client submits claim & creates Dodo checkout
    const createReq = new Request(`${baseUrl}/api/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandPayload),
    });
    const createRes = await handleCreatePayment(createReq);
    const createJson = await createRes.json();

    expect(createRes.status).toBe(200);
    expect(createJson.success).toBe(true);
    expect(createJson.data.sessionId).toBe("cks_case1_acme");
    expect(createJson.data.checkoutUrl).toBe("https://test.dodopayments.com/buy/cks_case1_acme");

    const { brandId, sessionId } = createJson.data;

    // Verify brand was initially created in pending state with $0 verified bid
    const pendingBrand = db.getBrandById(brandId);
    expect(pendingBrand).toBeDefined();
    expect(pendingBrand?.status).toBe("pending");
    expect(pendingBrand?.totalBid).toBe(0);

    // 3. Dodo sends payment.succeeded webhook
    const paymentId = `pay_dodo_case1_${Date.now()}`;
    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: paymentId,
        session_id: sessionId,
        total_amount: 1200000, // $12,000 in cents from Dodo
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId,
          brandName: "Acme Analytics",
          isRebid: "false",
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);

    // 4. Webhook arrives at /api/payments/webhook
    const webhookReq = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_case1_webhook_id",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookRes = await handleWebhook(webhookReq as any);
    const webhookJson = await webhookRes.json();

    expect(webhookRes.status).toBe(200);
    expect(webhookJson.received).toBe(true);
    expect(webhookJson.amount).toBe(12000);

    // 5. Verify database updates: payment recorded, brand total increased, status published
    const verifiedBrand = db.getBrandById(brandId);
    expect(verifiedBrand?.totalBid).toBe(12000);
    expect(["published", "active"]).toContain(verifiedBrand?.status);

    const paymentRecord = db.getPaymentByProviderId(paymentId);
    expect(paymentRecord).toBeDefined();
    expect(paymentRecord?.amount).toBe(12000);
    expect(paymentRecord?.status).toBe("verified");

    // 6. Verify Leaderboard placement
    const boardReq = new Request(`${baseUrl}/api/leaderboard`);
    const boardRes = await handleLeaderboard(boardReq);
    const boardJson = await boardRes.json();

    expect(boardJson.success).toBe(true);
    expect(boardJson.data.brands[0].id).toBe(brandId);
    expect(boardJson.data.brands[0].rank).toBe(1);
    expect(boardJson.data.brands[0].name).toBe("Acme Analytics");
  });

  // ===========================================================================
  // CASE 2 — Duplicate webhook
  // ===========================================================================
  it("CASE 2 — Duplicate webhook: ensures payment is recorded once and bid is only credited once", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;
    const paymentId = `pay_duplicate_test_${Date.now()}`;

    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: paymentId,
        session_id: "cks_duplicate_session",
        total_amount: 30000, // $300 USD
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    // First webhook delivery
    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);
    const req1 = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_dup_1",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });
    const res1 = await handleWebhook(req1 as any);
    expect(res1.status).toBe(200);

    const brandAfterFirst = db.getBrandById(brand.id);
    expect(brandAfterFirst?.totalBid).toBe(initialBid + 300);

    // Duplicate webhook delivery
    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);
    const req2 = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_dup_2",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });
    const res2 = await handleWebhook(req2 as any);
    const json2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(json2.message).toContain("idempotent skip");

    // Brand balance must NOT have been incremented a second time
    const brandAfterDuplicate = db.getBrandById(brand.id);
    expect(brandAfterDuplicate?.totalBid).toBe(initialBid + 300);

    // Bid history should have exactly 1 record for this payment
    const paymentRecord = db.getPaymentByProviderId(paymentId);
    expect(paymentRecord).toBeDefined();

    const history = db.getBidHistoryByBrandId(brand.id);
    const matches = history.filter((h) => h.paymentId === paymentRecord?.id);
    expect(matches.length).toBe(1);
  });

  // ===========================================================================
  // CASE 3 — Invalid webhook signature
  // ===========================================================================
  it("CASE 3 — Invalid webhook: rejects invalid signature and leaves database untouched", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;

    mockClient.webhooks.unwrap.mockImplementationOnce(() => {
      throw new Error("Invalid cryptographic signature");
    });

    const tamperedReq = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_tampered",
        "webhook-signature": "v1,forged_signature_attempt",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify({ type: "payment.succeeded", fake: true }),
    });

    const res = await handleWebhook(tamperedReq as any);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Invalid webhook signature");

    // Database state must be unchanged
    const unchangedBrand = db.getBrandById(brand.id);
    expect(unchangedBrand?.totalBid).toBe(initialBid);
  });

  // ===========================================================================
  // CASE 4 — Failed payment
  // ===========================================================================
  it("CASE 4 — Failed payment: does not increase leaderboard bid", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;
    const failedPaymentId = `pay_failed_${Date.now()}`;

    const failedPayload = {
      type: "payment.failed",
      data: {
        payment_id: failedPaymentId,
        session_id: "cks_failed_session",
        total_amount: 50000,
        currency: "USD",
        status: "failed",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(failedPayload);

    const req = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_failed",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(failedPayload),
    });

    const res = await handleWebhook(req as any);
    expect(res.status).toBe(200);

    // Total bid must remain unchanged
    const brandAfterFail = db.getBrandById(brand.id);
    expect(brandAfterFail?.totalBid).toBe(initialBid);

    // Payment record should exist as 'failed' with amount 0
    const payment = db.getPaymentByProviderId(failedPaymentId);
    expect(payment).toBeDefined();
    expect(payment?.status).toBe("failed");
    expect(payment?.amount).toBe(0);
  });

  // ===========================================================================
  // CASE 5 — Rebid flow ($100 existing + $50 new payment = $150 total)
  // ===========================================================================
  it("CASE 5 — Rebid: adds $50 rebid to existing $100 brand for exact $150 total", async () => {
    // 1. Create a brand with exactly $100
    const brandId = `brand_rebid_${Date.now()}`;
    db.insertBrand({
      id: brandId,
      name: "Rebid Test Brand",
      websiteUrl: "https://rebid-test.org",
      canonicalUrl: "rebid-test.org",
      category: "Fintech",
      slug: `rebid-test-${Date.now()}`,
      managementTokenHash: `hash_rebid_${Date.now()}`,
      logoUrl: null,
      description: null,
      tagline: null,
      template: "typography",
      clickCount: 0,
      totalBid: 100,
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const brandBefore = db.getBrandById(brandId);
    expect(brandBefore?.totalBid).toBe(100);

    // 2. Request rebid checkout session for $50
    mockClient.checkoutSessions.create.mockResolvedValueOnce({
      session_id: "cks_rebid_50",
      checkout_url: "https://test.dodopayments.com/buy/cks_rebid_50",
    });

    const rebidReq = new Request(`${baseUrl}/api/bids/increase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandId,
        additionalBid: 50,
      }),
    });
    const rebidRes = await handleIncreaseBid(rebidReq);
    const rebidJson = await rebidRes.json();
    expect(rebidRes.status).toBe(200);
    expect(rebidJson.success).toBe(true);
    expect(rebidJson.data.sessionId).toBe("cks_rebid_50");

    // 3. Fulfill via verified webhook
    const rebidPaymentId = `pay_rebid_${Date.now()}`;
    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: rebidPaymentId,
        session_id: "cks_rebid_50",
        total_amount: 5000, // $50 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId,
          brandName: "Rebid Test Brand",
          isRebid: "true",
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);
    const webhookReq = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_rebid_webhook",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookRes = await handleWebhook(webhookReq as any);
    expect(webhookRes.status).toBe(200);

    // 4. Verify exact total of $150
    const brandAfter = db.getBrandById(brandId);
    expect(brandAfter?.totalBid).toBe(150);
  });

  // ===========================================================================
  // CASE 6 — Client manipulation
  // ===========================================================================
  it("CASE 6 — Client manipulation: frontend cannot dictate paid amount; only Dodo verified data is credited", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;

    // Attacker tries to query status with an arbitrary amount $99,999
    const statusReq = new Request(
      `${baseUrl}/api/payments/status?session_id=cks_unverified&brand_id=${brand.id}&amount=99999&status=succeeded`
    );
    const statusRes = await handleStatus(statusReq as any);
    const statusJson = await statusRes.json();

    expect(statusRes.status).toBe(200);
    // Status route must be strictly read-only
    expect(statusJson.data.isVerified).toBe(false);

    // Verify brand total was NOT manipulated
    const unchangedBrand = db.getBrandById(brand.id);
    expect(unchangedBrand?.totalBid).toBe(initialBid);

    // Now send a real webhook from Dodo that verified $25.00
    const legitPaymentId = `pay_legit_${Date.now()}`;
    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: legitPaymentId,
        session_id: "cks_legit_session",
        total_amount: 2500, // $25.00 USD
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(webhookPayload);
    const webhookReq = new Request(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "webhook-id": "evt_legit",
        "webhook-signature": "v1,valid_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(webhookPayload),
    });
    await handleWebhook(webhookReq as any);

    // Exactly $25 was credited, NOT $99,999
    const finalBrand = db.getBrandById(brand.id);
    expect(finalBrand?.totalBid).toBe(initialBid + 25);
  });

  // ===========================================================================
  // CASE 7 — Concurrent payments (no lost updates)
  // ===========================================================================
  it("CASE 7 — Concurrent payments: two simultaneous payments for the same brand sum accurately without lost updates", async () => {
    const brandId = `brand_concurrent_${Date.now()}`;
    db.insertBrand({
      id: brandId,
      name: "Concurrent Test Brand",
      websiteUrl: "https://concurrent-test.com",
      canonicalUrl: "concurrent-test.com",
      category: "Developer Tools",
      slug: `concurrent-test-${Date.now()}`,
      managementTokenHash: `hash_conc_${Date.now()}`,
      logoUrl: null,
      description: null,
      tagline: null,
      template: "typography",
      clickCount: 0,
      totalBid: 100, // Initial $100
      status: "published",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const paymentA = {
      type: "payment.succeeded",
      data: {
        payment_id: `pay_conc_A_${Date.now()}`,
        total_amount: 4000, // $40
        currency: "USD",
        status: "succeeded",
        metadata: { brandId },
      },
    };

    const paymentB = {
      type: "payment.succeeded",
      data: {
        payment_id: `pay_conc_B_${Date.now()}`,
        total_amount: 6000, // $60
        currency: "USD",
        status: "succeeded",
        metadata: { brandId },
      },
    };

    // Process both simultaneously via Promise.all
    const [resultA, resultB] = await Promise.all([
      fulfillDodoPayment(paymentA),
      fulfillDodoPayment(paymentB),
    ]);

    expect(resultA.success).toBe(true);
    expect(resultB.success).toBe(true);

    // Expected: $100 + $40 + $60 = $200
    const finalBrand = db.getBrandById(brandId);
    expect(finalBrand?.totalBid).toBe(200);
  });

  // ===========================================================================
  // CASE 8 — Invalid/Dangerous website URL rejected safely
  // ===========================================================================
  it("CASE 8 — Invalid website: safely rejects SSRF, localhost, and dangerous schemes", async () => {
    const dangerousUrls = [
      "javascript:alert(1)",
      "data:text/html,<h1>PWNED</h1>",
      "http://localhost:3000",
      "http://127.0.0.1:8080/admin",
      "http://169.254.169.254/latest/meta-data",
    ];

    for (const url of dangerousUrls) {
      const req = new Request(`${baseUrl}/api/payments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: url,
          name: "Exploit Attempt",
          category: "Developer Tools",
          bidAmount: 100,
        }),
      });

      const res = await handleCreatePayment(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Dangerous URL scheme|Invalid URL|Private, local, or internal addresses are forbidden|Access to internal host|Direct access to private or internal/i);
    }
  });

  // ===========================================================================
  // CASE 9 — Dodo unavailable
  // ===========================================================================
  it("CASE 9 — Dodo unavailable: handles API failure cleanly without creating fake payments", async () => {
    mockClient.checkoutSessions.create.mockRejectedValueOnce(
      new Error("Dodo Payments service timeout: 503 Service Unavailable")
    );

    const req = new Request(`${baseUrl}/api/payments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        websiteUrl: "https://safe-startup.io",
        name: "Safe Startup",
        category: "AI",
        bidAmount: 500,
      }),
    });

    const res = await handleCreatePayment(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/Dodo Payments service timeout|Unable to initialize payment/i);

    // Ensure no published active brand exists for this attempt
    const brands = db.getPublishedBrands();
    const found = brands.find((b) => b.name === "Safe Startup");
    expect(found).toBeUndefined();
  });
});
