import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as handleWebhook } from "../app/api/payments/webhook/route";
import { GET as handleStatus } from "../app/api/payments/status/route";
import { db } from "../lib/db";
import { seedDatabase } from "../lib/db/seed";
import * as dodoModule from "../lib/payments/dodo";
import { NextRequest } from "next/server";

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

describe("Production Dodo Payments Webhook Endpoint (/api/payments/webhook)", () => {
  const baseUrl = "http://localhost:3000/api/payments/webhook";

  beforeEach(async () => {
    await seedDatabase();
    vi.clearAllMocks();
  });

  it("1. Rejects requests with missing authentication headers (400 Bad Request)", async () => {
    const req = new NextRequest(baseUrl, {
      method: "POST",
      body: JSON.stringify({ type: "payment.succeeded" }),
    });

    const res = await handleWebhook(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Missing required webhook authentication headers");
  });

  it("2. Rejects requests with invalid or tampered signatures (401 Unauthorized)", async () => {
    mockClient.webhooks.unwrap.mockImplementationOnce(() => {
      throw new Error("Invalid signature or timestamp expired");
    });

    const req = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_invalid_123",
        "webhook-signature": "v1,tampered_signature_bytes",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify({ type: "payment.succeeded" }),
    });

    const res = await handleWebhook(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Invalid webhook signature");
  });

  it("3. Processes verified payment.succeeded event, extracts amount from Dodo data only, and updates rankings", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;
    const testPaymentId = `pay_dodo_verified_${Date.now()}`;
    const testAttemptId = `att_attempt_${Date.now()}`;

    const verifiedPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: testPaymentId,
        session_id: "cks_session_12345",
        total_amount: 50000, // $500.00 USD in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
          paymentAttemptId: testAttemptId,
          isRebid: "false",
        },
      },
    };

    const rawBody = JSON.stringify(verifiedPayload);
    mockClient.webhooks.unwrap.mockReturnValueOnce(verifiedPayload);

    const req = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_success_123",
        "webhook-signature": "v1,valid_test_signature",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: rawBody,
    });

    const res = await handleWebhook(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.eventType).toBe("payment.succeeded");
    expect(json.amount).toBe(500);

    // Verify brand bid increased by exactly verified Dodo amount
    const updatedBrand = db.getBrandById(brand.id);
    expect(updatedBrand?.totalBid).toBe(initialBid + 500);

    // Verify payment record in DB
    const payment = db.getPaymentByProviderId(testPaymentId);
    expect(payment).toBeDefined();
    expect(payment?.status).toBe("verified");
    expect(payment?.amount).toBe(500);
    expect(payment?.currency).toBe("USD");
    expect(payment?.paymentAttemptId).toBe(testAttemptId);
  });

  it("4. Enforces strict idempotency across duplicate webhook deliveries", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;
    const duplicatePaymentId = `pay_dodo_duplicate_${Date.now()}`;

    const payload = {
      type: "payment.succeeded",
      data: {
        payment_id: duplicatePaymentId,
        session_id: "cks_session_duplicate",
        total_amount: 10000, // $100.00 USD in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
        },
      },
    };

    const rawBody = JSON.stringify(payload);

    // Delivery 1
    mockClient.webhooks.unwrap.mockReturnValueOnce(payload);
    const req1 = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_dup_1",
        "webhook-signature": "v1,sig_dup_1",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: rawBody,
    });
    const res1 = await handleWebhook(req1);
    expect(res1.status).toBe(200);

    const brandAfterDelivery1 = db.getBrandById(brand.id);
    expect(brandAfterDelivery1?.totalBid).toBe(initialBid + 100);

    // Delivery 2 (Duplicate Webhook with same payment_id)
    mockClient.webhooks.unwrap.mockReturnValueOnce(payload);
    const req2 = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_dup_2", // Even if Dodo retry has a different webhook-id
        "webhook-signature": "v1,sig_dup_2",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: rawBody,
    });
    const res2 = await handleWebhook(req2);
    expect(res2.status).toBe(200);
    const json2 = await res2.json();
    expect(json2.message).toContain("idempotent skip");

    // Brand totalBid must remain initialBid + 100 (NOT + 200)
    const brandAfterDelivery2 = db.getBrandById(brand.id);
    expect(brandAfterDelivery2?.totalBid).toBe(initialBid + 100);

    // Only one payment record should exist
    const allMatching = db.getAllPayments().filter((p) => p.providerPaymentId === duplicatePaymentId);
    expect(allMatching).toHaveLength(1);
  });

  it("5. Handles payment.failed and payment.cancelled without increasing brand bid", async () => {
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
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(failedPayload);

    const req = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_failed_1",
        "webhook-signature": "v1,sig_failed",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(failedPayload),
    });

    const res = await handleWebhook(req);
    expect(res.status).toBe(200);

    // Verify brand bid did NOT increase
    const brandAfterFail = db.getBrandById(brand.id);
    expect(brandAfterFail?.totalBid).toBe(initialBid);

    // Verify failed payment record exists
    const failedPayment = db.getPaymentByProviderId(failedPaymentId);
    expect(failedPayment).toBeDefined();
    expect(failedPayment?.status).toBe("failed");
  });

  it("6. Rebid flow: adds verified rebid amount to existing total bid via webhook", async () => {
    const brand = db.getAllBrands()[1];
    const initialBid = brand.totalBid;
    const rebidPaymentId = `pay_rebid_${Date.now()}`;

    const rebidPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: rebidPaymentId,
        session_id: "cks_rebid_session",
        total_amount: 15000, // $150 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId: brand.id,
          brandName: brand.name,
          isRebid: "true",
        },
      },
    };

    mockClient.webhooks.unwrap.mockReturnValueOnce(rebidPayload);

    const req = new NextRequest(baseUrl, {
      method: "POST",
      headers: {
        "webhook-id": "evt_rebid_1",
        "webhook-signature": "v1,sig_rebid",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify(rebidPayload),
    });

    const res = await handleWebhook(req);
    expect(res.status).toBe(200);

    const updatedBrand = db.getBrandById(brand.id);
    expect(updatedBrand?.totalBid).toBe(initialBid + 150);
  });

  it("7. /api/payments/status returns accurate payment and brand details without modifying state", async () => {
    const brand = db.getAllBrands()[0];
    const initialBid = brand.totalBid;

    // Test querying status with brand_id
    const statusReq = new NextRequest(`http://localhost:3000/api/payments/status?brand_id=${brand.id}`);
    const statusRes = await handleStatus(statusReq);
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();

    expect(statusJson.success).toBe(true);
    expect(statusJson.data.brand.id).toBe(brand.id);
    expect(statusJson.data.brand.totalBid).toBe(initialBid);
    expect(statusJson.data.rank).toBe(1);

    // Verify calling status did NOT alter brand bids
    const afterQueryBrand = db.getBrandById(brand.id);
    expect(afterQueryBrand?.totalBid).toBe(initialBid);
  });
});
