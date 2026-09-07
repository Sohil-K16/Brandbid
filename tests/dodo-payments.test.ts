import { describe, it, expect } from "vitest";
import {
  createDodoCheckoutSession,
  verifyDodoWebhook,
  retrieveDodoCheckoutSession,
} from "../lib/payments/dodo";
import { db } from "../lib/db/index";

describe("Dodo Payments Architecture & Idempotency", () => {
  it("creates a compliant Dodo Checkout Session", async () => {
    const session = await createDodoCheckoutSession({
      amount: 500,
      brandId: "brand_test_dodo",
      brandName: "Acme Corp",
      customerEmail: "founder@acme.com",
    });

    expect(session).toBeDefined();
    expect(session.sessionId).toMatch(/^cks_/);
    expect(session.amount).toBe(500);
    expect(session.currency).toBe("USD");
    expect(session.checkoutUrl).toBeDefined();
  });

  it("retrieves session status properly", async () => {
    const status = await retrieveDodoCheckoutSession("cks_mock_12345");
    expect(status).toBeDefined();
    expect(status?.payment_status).toBe("succeeded");
  });

  it("verifies webhook signatures properly in test mode", () => {
    const validBody = JSON.stringify({
      type: "payment.succeeded",
      data: {
        payment_id: "pay_dodo_123",
        total_amount: 50000,
        metadata: { brandId: "brand_test_dodo" },
      },
    });

    const verification = verifyDodoWebhook({
      rawBody: validBody,
      headers: {
        "webhook-id": "evt_test_123",
        "webhook-signature": "mock_sig_valid",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
    });

    expect(verification.isValid).toBe(true);
    expect(verification.event?.type).toBe("payment.succeeded");
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
