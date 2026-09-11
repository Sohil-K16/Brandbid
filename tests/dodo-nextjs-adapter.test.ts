import { describe, it, expect, beforeEach } from "vitest";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";
import { dodoEnvironment, getDodoWebhookKey } from "../lib/dodo-env";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

describe("Official @dodopayments/nextjs Adapter Integration", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  it("1. Validates environment configurations and webhook signing key normalization", () => {
    expect(["test_mode", "live_mode"]).toContain(dodoEnvironment);
    const webhookKey = getDodoWebhookKey();
    expect(webhookKey).toBeDefined();
    expect(webhookKey.startsWith("whsec_")).toBe(true);
  });

  it("2. Fulfills a Dodo payment webhook event idempotently", async () => {
    const brand = db.getAllBrands()[0];
    const originalTotalBid = brand.totalBid;
    const testPaymentId = `pay_dodo_unit_${Date.now()}`;
    const testSessionId = `cks_dodo_unit_${Date.now()}`;

    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: testPaymentId,
        session_id: testSessionId,
        total_amount: 50000, // $500.00 USD in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    // First fulfillment attempt
    const result1 = await fulfillDodoPayment(webhookPayload);
    expect(result1.success).toBe(true);
    expect(result1.amount).toBe(500);

    const updatedBrand = db.getBrandById(brand.id);
    expect(updatedBrand?.totalBid).toBe(originalTotalBid + 500);

    // Verify payment record in DB
    const payment = db.getPaymentByProviderId(testPaymentId);
    expect(payment).toBeDefined();
    expect(payment?.amount).toBe(500);
    expect(payment?.status).toBe("verified");

    // Second fulfillment attempt with the exact same payload (Idempotency test)
    const result2 = await fulfillDodoPayment(webhookPayload);
    expect(result2.success).toBe(true);
    expect(result2.message).toContain("idempotent skip");

    // Ensure total bid was NOT incremented again
    const brandAfterDuplicate = db.getBrandById(brand.id);
    expect(brandAfterDuplicate?.totalBid).toBe(originalTotalBid + 500);
  });

  it("3. Handles non-payment webhook events gracefully without altering brand bids", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;

    const subscriptionEvent = {
      type: "subscription.renewed",
      data: {
        subscription_id: "sub_123",
        status: "active",
      },
    };

    const result = await fulfillDodoPayment(subscriptionEvent);
    expect(result.success).toBe(true);
    expect(result.message).toContain("Ignored");

    const unchangedBrand = db.getBrandById(brand.id);
    expect(unchangedBrand?.totalBid).toBe(initialBid);
  });
});
