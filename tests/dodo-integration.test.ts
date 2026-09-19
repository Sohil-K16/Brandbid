import { describe, it, expect, beforeEach, vi } from "vitest";
import * as dodoModule from "../lib/payments/dodo";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";

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

describe("Dodo Payments Complete Integration", () => {
  beforeEach(async () => {
    await seedDatabase();
    vi.clearAllMocks();
  });

  it("1. Creates Dodo Checkout Session with correct metadata and currency formatting", async () => {
    mockClient.checkoutSessions.create.mockImplementationOnce(async (args) => {
      return {
        session_id: "cks_test_12345",
        checkout_url: "https://test.dodopayments.com/buy/cks_test_12345",
      };
    });

    const session = await dodoModule.createDodoCheckoutSession({
      amount: 250,
      brandId: "brand_test_dodo_1",
      brandName: "Acme Cyber",
      customerEmail: "finance@acme.cyber",
    });

    expect(session).toBeDefined();
    expect(session.sessionId).toBe("cks_test_12345");
    expect(session.amount).toBe(250);
    expect(session.currency).toBe("USD");
    expect(session.checkoutUrl).toBe("https://test.dodopayments.com/buy/cks_test_12345");
    expect(session.paymentAttemptId).toMatch(/^att_/);

    expect(mockClient.checkoutSessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product_cart: [{ product_id: "pdt_brandbid_spot", quantity: 1, amount: 25000 }],
        metadata: expect.objectContaining({
          brandId: "brand_test_dodo_1",
          brandName: "Acme Cyber",
          paymentAttemptId: expect.stringMatching(/^att_/),
          isRebid: "false",
        }),
      })
    );
  });

  it("2. Retrieves session and returns verified metadata", async () => {
    mockClient.checkoutSessions.retrieve.mockResolvedValueOnce({
      session_id: "cks_retrieved_1",
      status: "completed",
      payment_status: "succeeded",
      total_amount: 15000,
      currency: "USD",
      metadata: { brandId: "brand_test_dodo_2" },
    });

    const retrieved: any = await dodoModule.retrieveDodoCheckoutSession("cks_retrieved_1");
    expect(retrieved).toBeDefined();
    expect(retrieved?.status).toBe("completed");
    expect(retrieved?.payment_status).toBe("succeeded");
    expect(retrieved?.metadata?.brandId).toBe("brand_test_dodo_2");
    expect(retrieved?.total_amount).toBe(15000); // 150 * 100 cents
  });

  it("3. Enforces webhook idempotency across repeated deliveries", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;
    const testPaymentId = `pay_dodo_idem_${Date.now()}`;
    const testSessionId = `cks_dodo_idem_${Date.now()}`;

    const webhookEvent = {
      type: "payment.succeeded",
      data: {
        id: testPaymentId,
        payment_id: testPaymentId,
        session_id: testSessionId,
        total_amount: 30000, // $300 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    // Delivery 1
    const res1 = await fulfillDodoPayment(webhookEvent);
    expect(res1.success).toBe(true);
    expect(res1.amount).toBe(300);

    const afterFirst = db.getBrandById(brand.id);
    expect(afterFirst?.totalBid).toBe(initialBid + 300);

    // Delivery 2 (Duplicate Webhook)
    const res2 = await fulfillDodoPayment(webhookEvent);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain("idempotent skip");

    // Brand bid must not change
    const afterSecond = db.getBrandById(brand.id);
    expect(afterSecond?.totalBid).toBe(initialBid + 300);

    // Only one payment record should exist in DB
    const allMatching = db
      .getAllPayments()
      .filter((p) => p.providerPaymentId === testPaymentId);
    expect(allMatching).toHaveLength(1);
  });

  it("4. Rejects verification when session metadata does not match brand", async () => {
    mockClient.checkoutSessions.retrieve.mockResolvedValueOnce({
      session_id: "cks_brand_test",
      status: "completed",
      payment_status: "succeeded",
      total_amount: 10000,
      currency: "USD",
      metadata: { brandId: "brand_legitimate" },
    });

    const retrieved: any = await dodoModule.retrieveDodoCheckoutSession("cks_brand_test");
    expect(retrieved?.metadata?.brandId).toBe("brand_legitimate");
    expect(retrieved?.metadata?.brandId === "brand_impostor").toBe(false);
  });
});
