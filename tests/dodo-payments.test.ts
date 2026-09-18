import { beforeEach, describe, expect, it } from "vitest";
import {
  assertDodoCheckoutConfig,
  createDodoCheckoutSession,
  retrieveDodoCheckoutSession,
  verifyDodoWebhook,
} from "../lib/payments/dodo";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

describe("Dodo Payments production hardening", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    await seedDatabase();
  });

  it("fails closed for missing production checkout config", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.DODO_PAYMENTS_ENVIRONMENT = "live_mode";
    process.env.DODO_PAYMENTS_API_KEY = "your_test_api_key";
    process.env.DODO_PAYMENTS_PRODUCT_ID = "pdt_placeholder_product_id";
    process.env.NEXT_PUBLIC_APP_URL = "https://brandbid.me";

    expect(() => assertDodoCheckoutConfig()).toThrow(/Missing required Dodo configuration/);
  });

  it("creates and retrieves mock checkout sessions in non-production", async () => {
    const session = await createDodoCheckoutSession({
      amount: 500,
      brandId: "brand_test_dodo",
      brandName: "Acme Corp",
      customerEmail: "founder@acme.com",
    });

    expect(session.sessionId).toMatch(/^cks_mock_/);
    expect(session.isMock).toBe(true);

    const retrieved = await retrieveDodoCheckoutSession(session.sessionId);
    expect(retrieved).toBeDefined();
    expect((retrieved as any)?.metadata?.brandId).toBe("brand_test_dodo");
    expect((retrieved as any)?.metadata?.amount).toBe("500");
  });

  it("rejects invalid webhook signatures in production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.DODO_PAYMENTS_ENVIRONMENT = "live_mode";
    process.env.DODO_PAYMENTS_API_KEY = "dp_live_valid_like_key_123456";
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = "whsec_dmFsaWR3ZWJob29rMTIz";

    const verification = verifyDodoWebhook({
      rawBody: JSON.stringify({ type: "payment.succeeded", data: {} }),
      headers: {
        "webhook-id": "evt_test_123",
        "webhook-signature": "invalid_signature",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
    });

    expect(verification.isValid).toBe(false);
    expect(verification.event).toBeNull();
  });

  it("rejects fulfillment when metadata amount is missing or mismatched", async () => {
    const brand = db.getAllBrands()[0];
    const initialTotal = brand.totalBid;

    const missingAmountResult = await fulfillDodoPayment({
      type: "payment.succeeded",
      data: {
        payment_id: `pay_missing_${Date.now()}`,
        session_id: `cks_missing_${Date.now()}`,
        total_amount: 12000,
        metadata: { brandId: brand.id },
      },
    });
    expect(missingAmountResult.success).toBe(false);

    const mismatchResult = await fulfillDodoPayment({
      type: "payment.succeeded",
      data: {
        payment_id: `pay_mismatch_${Date.now()}`,
        session_id: `cks_mismatch_${Date.now()}`,
        total_amount: 5000,
        metadata: { brandId: brand.id, amount: "10", amountInCents: "1000" },
      },
    });
    expect(mismatchResult.success).toBe(false);
    expect(db.getBrandById(brand.id)?.totalBid).toBe(initialTotal);
  });

  it("fulfills claim and rebid once each with idempotent duplicate handling", async () => {
    const now = new Date().toISOString();
    const claimBrandId = `brand_claim_${Date.now()}`;

    db.insertBrand({
      id: claimBrandId,
      websiteUrl: "https://claim-test.com",
      canonicalUrl: "claim-test.com",
      slug: "claim-test",
      name: "Claim Test",
      category: "SaaS",
      logoUrl: null,
      description: null,
      tagline: null,
      totalBid: 0,
      status: "pending",
      managementTokenHash: "hash_claim_test",
      template: "typography",
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const claimPaymentId = `pay_claim_${Date.now()}`;
    const claimPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: claimPaymentId,
        session_id: `cks_claim_${Date.now()}`,
        total_amount: 15000,
        metadata: {
          brandId: claimBrandId,
          brandName: "Claim Test",
          amount: "150",
          amountInCents: "15000",
          isRebid: "false",
        },
      },
    };

    const claimResult = await fulfillDodoPayment(claimPayload);
    expect(claimResult.success).toBe(true);
    expect(db.getBrandById(claimBrandId)?.status).toBe("published");
    expect(db.getBrandById(claimBrandId)?.totalBid).toBe(150);

    const claimDuplicate = await fulfillDodoPayment(claimPayload);
    expect(claimDuplicate.success).toBe(true);
    expect(db.getAllPayments().filter((p) => p.providerPaymentId === claimPaymentId)).toHaveLength(1);
    expect(db.getBrandById(claimBrandId)?.totalBid).toBe(150);

    const rebidBrand = db.getBrandById(claimBrandId)!;
    const rebidStart = rebidBrand.totalBid;
    const rebidResult = await fulfillDodoPayment({
      type: "payment.succeeded",
      data: {
        payment_id: `pay_rebid_${Date.now()}`,
        session_id: `cks_rebid_${Date.now()}`,
        total_amount: 2500,
        metadata: {
          brandId: rebidBrand.id,
          brandName: rebidBrand.name,
          amount: "25",
          amountInCents: "2500",
          isRebid: "true",
        },
      },
    });

    expect(rebidResult.success).toBe(true);
    expect(db.getBrandById(rebidBrand.id)?.totalBid).toBe(rebidStart + 25);
    const bidHistory = db.getBidHistoryByBrandId(rebidBrand.id);
    expect(bidHistory.length).toBeGreaterThanOrEqual(2);
    expect(bidHistory[0].newTotal).toBe(175);
  });
});
