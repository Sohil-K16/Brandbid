import { describe, it, expect, vi, beforeEach } from "vitest";
import * as dodoModule from "../lib/payments/dodo";
import { getDodoWebhookKey } from "../lib/dodo-env";
import { db } from "../lib/db/index";
import crypto from "crypto";

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

import { seedDatabase } from "../lib/db/seed";

describe("Dodo Payments Architecture & Idempotency", () => {
  beforeEach(async () => {
    await seedDatabase();
    vi.clearAllMocks();
  });

  it("creates a compliant Dodo Checkout Session", async () => {
    mockClient.checkoutSessions.create.mockResolvedValueOnce({
      session_id: "cks_real_test_12345",
      checkout_url: "https://test.dodopayments.com/buy/cks_real_test_12345",
    });

    const session = await dodoModule.createDodoCheckoutSession({
      amount: 500,
      brandId: "brand_test_dodo",
      brandName: "Acme Corp",
      customerEmail: "founder@acme.com",
    });

    expect(session).toBeDefined();
    expect(session.sessionId).toBe("cks_real_test_12345");
    expect(session.checkoutUrl).toBe("https://test.dodopayments.com/buy/cks_real_test_12345");
    expect(session.amount).toBe(500);
    expect(session.currency).toBe("USD");
    expect(session.paymentAttemptId).toMatch(/^att_/);

    // Verify Dodo SDK was called with the exact right arguments
    expect(mockClient.checkoutSessions.create).toHaveBeenCalledWith({
      product_cart: [
        {
          product_id: "pdt_brandbid_spot",
          quantity: 1,
          amount: 50000, // $500 in cents
        },
      ],
      customer: {
        email: "founder@acme.com",
        name: "Acme Corp",
      },
      metadata: {
        brandId: "brand_test_dodo",
        brandName: "Acme Corp",
        paymentAttemptId: expect.stringMatching(/^att_/),
        isRebid: "false",
        amount: "500",
      },
      return_url: expect.stringContaining("/success"),
    });
  });

  it("retrieves session status properly", async () => {
    mockClient.checkoutSessions.retrieve.mockResolvedValueOnce({
      session_id: "cks_real_test_12345",
      payment_status: "succeeded",
      status: "completed",
      total_amount: 50000,
      currency: "USD",
      metadata: { brandId: "brand_test_dodo" },
    });

    const status = await dodoModule.retrieveDodoCheckoutSession("cks_real_test_12345");
    expect(status).toBeDefined();
    expect(status?.payment_status).toBe("succeeded");
    expect(mockClient.checkoutSessions.retrieve).toHaveBeenCalledWith("cks_real_test_12345");
  });

  it("verifies webhook signatures properly using unwrap", () => {
    const validBody = JSON.stringify({
      type: "payment.succeeded",
      data: {
        payment_id: "pay_dodo_123",
        total_amount: 50000,
        metadata: { brandId: "brand_test_dodo" },
      },
    });

    mockClient.webhooks.unwrap.mockReturnValueOnce(JSON.parse(validBody));

    const event = dodoModule.verifyDodoWebhook({
      rawBody: validBody,
      headers: {
        "webhook-id": "evt_test_123",
        "webhook-signature": "v1,mock_signature",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
    });

    expect(event).toBeDefined();
    expect(event.type).toBe("payment.succeeded");
    expect(mockClient.webhooks.unwrap).toHaveBeenCalledWith(validBody, {
      headers: {
        "webhook-id": "evt_test_123",
        "webhook-signature": "v1,mock_signature",
        "webhook-timestamp": expect.any(String),
      },
      key: expect.any(String),
    });
  });

  it("enforces database payment idempotency for Dodo Payments", () => {
    const testPaymentId = "pay_dodo_idem_" + Date.now();

    const payment1 = db.insertPayment({
      id: testPaymentId,
      brandId: "brand_synthetix",
      providerPaymentId: testPaymentId,
      providerOrderId: "cks_idem_test",
      amount: 500,
      currency: "USD",
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    expect(payment1.providerPaymentId).toBe(testPaymentId);

    // Attempt duplicate insert with same providerPaymentId
    const payment2 = db.insertPayment({
      id: "another_dodo_id",
      brandId: "brand_synthetix",
      providerPaymentId: testPaymentId,
      providerOrderId: "cks_idem_test",
      amount: 500,
      currency: "USD",
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    expect(payment2.id).toBe(testPaymentId);

    const allWithId = db
      .getAllPayments()
      .filter((p) => p.providerPaymentId === testPaymentId);
    expect(allWithId).toHaveLength(1);
  });
});
