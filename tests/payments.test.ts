import { describe, it, expect } from "vitest";
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "../lib/payments/razorpay";
import { db } from "../lib/db/index";

describe("Payment Architecture & Idempotency", () => {
  it("creates a compliant Razorpay order", async () => {
    const order = await createRazorpayOrder({
      amount: 500,
      receipt: "rcpt_test_123",
      notes: { brandId: "brand_test" },
    });

    expect(order).toBeDefined();
    expect(order.amount).toBe(50000); // 500 * 100 cents
    expect(order.currency).toBe("USD");
    expect(order.status).toBe("created");
  });

  it("verifies payment signatures properly in test mode", () => {
    const valid = verifyRazorpaySignature({
      razorpayOrderId: "order_mock_12345",
      razorpayPaymentId: "pay_mock_12345",
      razorpaySignature: "mock_sig_12345",
    });

    expect(valid).toBe(true);

    const invalid = verifyRazorpaySignature({
      razorpayOrderId: "order_mock_12345",
      razorpayPaymentId: "pay_mock_12345",
      razorpaySignature: "invalid_signature",
    });

    expect(invalid).toBe(false);
  });

  it("enforces database payment idempotency (duplicate webhook calls do not duplicate payments)", () => {
    const testPaymentId = "pay_idem_test_" + Date.now();

    const payment1 = db.insertPayment({
      id: testPaymentId,
      brandId: "brand_synthetix",
      providerPaymentId: testPaymentId,
      providerOrderId: "order_idem_test",
      amount: 500,
      currency: "USD",
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    expect(payment1.providerPaymentId).toBe(testPaymentId);

    // Attempt second insert with identical providerPaymentId
    const payment2 = db.insertPayment({
      id: "another_internal_id",
      brandId: "brand_synthetix",
      providerPaymentId: testPaymentId,
      providerOrderId: "order_idem_test",
      amount: 5000,
      currency: "INR",
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    });

    // Should return existing record, not insert duplicate
    expect(payment2.id).toBe(testPaymentId);

    const allWithId = db.getAllPayments().filter((p) => p.providerPaymentId === testPaymentId);
    expect(allWithId).toHaveLength(1);
  });
});
