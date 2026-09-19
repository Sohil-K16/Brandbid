import { describe, it, expect, beforeEach } from "vitest";
import { db, Brand, Payment, BidHistoryItem } from "../lib/db";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";
import { calculateRankings } from "../lib/ranking/ranking-engine";

describe("Persistence Layer & Production Payment Safety", () => {
  beforeEach(() => {
    db.clearAll();
  });

  describe("Schema Integrity & Field Structure", () => {
    it("persists Brand with all required fields (id, websiteUrl, name, category, totalBid, status, createdAt, updatedAt)", () => {
      const now = new Date().toISOString();
      const brand: Brand = {
        id: "brand_audit_1",
        websiteUrl: "https://audit-brand.io",
        canonicalUrl: "audit-brand.io",
        slug: "audit-brand",
        name: "Audit Brand",
        category: "SaaS",
        logoUrl: null,
        description: "Test brand description",
        tagline: "Test tagline",
        totalBid: 250,
        status: "published",
        managementTokenHash: "token_hash_audit",
        template: "typography",
        clickCount: 12,
        createdAt: now,
        updatedAt: now,
      };

      const inserted = db.insertBrand(brand);
      expect(inserted.id).toBe("brand_audit_1");
      expect(inserted.websiteUrl).toBe("https://audit-brand.io");
      expect(inserted.name).toBe("Audit Brand");
      expect(inserted.category).toBe("SaaS");
      expect(inserted.totalBid).toBe(250);
      expect(inserted.status).toBe("published");
      expect(inserted.createdAt).toBe(now);
      expect(inserted.updatedAt).toBe(now);

      const retrieved = db.getBrandById("brand_audit_1");
      expect(retrieved).not.toBeNull();
      expect(retrieved?.totalBid).toBe(250);
    });

    it("persists Payment with provider, providerPaymentId, providerSessionId, amount, currency, status, verifiedAt", () => {
      const now = new Date().toISOString();
      const payment: Payment = {
        id: "pay_test_audit_1",
        brandId: "brand_audit_1",
        provider: "dodo",
        providerPaymentId: "dodo_pay_unique_123",
        providerSessionId: "cks_dodo_session_456",
        providerOrderId: "cks_dodo_session_456",
        paymentAttemptId: "att_789",
        amount: 250,
        currency: "USD",
        status: "verified",
        createdAt: now,
        verifiedAt: now,
      };

      const inserted = db.insertPayment(payment);
      expect(inserted.provider).toBe("dodo");
      expect(inserted.providerPaymentId).toBe("dodo_pay_unique_123");
      expect(inserted.providerSessionId).toBe("cks_dodo_session_456");
      expect(inserted.amount).toBe(250);
      expect(inserted.currency).toBe("USD");
      expect(inserted.status).toBe("verified");
      expect(inserted.verifiedAt).toBe(now);

      const retrieved = db.getPaymentByProviderId("dodo_pay_unique_123");
      expect(retrieved?.id).toBe("pay_test_audit_1");
    });

    it("persists BidHistory with id, brandId, paymentId, amount, totalAfter, createdAt", () => {
      const now = new Date().toISOString();
      const historyItem: BidHistoryItem = {
        id: "hist_audit_1",
        brandId: "brand_audit_1",
        paymentId: "pay_test_audit_1",
        amount: 150,
        totalAfter: 400,
        amountAdded: 150,
        previousTotal: 250,
        newTotal: 400,
        previousRank: null,
        newRank: 1,
        createdAt: now,
      };

      const inserted = db.insertBidHistory(historyItem);
      expect(inserted.id).toBe("hist_audit_1");
      expect(inserted.brandId).toBe("brand_audit_1");
      expect(inserted.paymentId).toBe("pay_test_audit_1");
      expect(inserted.amount).toBe(150);
      expect(inserted.totalAfter).toBe(400);

      const history = db.getBidHistoryByBrandId("brand_audit_1");
      expect(history.length).toBe(1);
      expect(history[0].amount).toBe(150);
      expect(history[0].totalAfter).toBe(400);
    });
  });

  describe("Unique Constraints & Idempotency", () => {
    it("enforces uniqueness of providerPaymentId and rejects double insertions", () => {
      const now = new Date().toISOString();
      const payment: Payment = {
        id: "pay_uniq_1",
        brandId: "brand_audit_1",
        provider: "dodo",
        providerPaymentId: "dodo_pay_unique_constraint_test",
        providerSessionId: "cks_1",
        providerOrderId: "cks_1",
        amount: 100,
        currency: "USD",
        status: "verified",
        createdAt: now,
        verifiedAt: now,
      };

      db.insertPayment(payment);

      // Attempt second insertion with same providerPaymentId
      const duplicate: Payment = {
        id: "pay_uniq_2",
        brandId: "brand_audit_1",
        provider: "dodo",
        providerPaymentId: "dodo_pay_unique_constraint_test",
        providerSessionId: "cks_1",
        providerOrderId: "cks_1",
        amount: 100,
        currency: "USD",
        status: "verified",
        createdAt: now,
        verifiedAt: now,
      };

      db.insertPayment(duplicate);

      const matching = db.getAllPayments().filter(
        (p) => p.providerPaymentId === "dodo_pay_unique_constraint_test"
      );
      // Must be exactly 1 record
      expect(matching.length).toBe(1);
    });

    it("duplicate Dodo webhooks are idempotent and DO NOT increase the brand total a second time", async () => {
      const brandId = "brand_idempotency_audit";
      db.insertBrand({
        id: brandId,
        websiteUrl: "https://idempotent-brand.com",
        canonicalUrl: "idempotent-brand.com",
        slug: "idempotent-brand",
        name: "Idempotent Brand",
        category: "Fintech",
        totalBid: 0,
        status: "pending",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "hash_idem",
        template: "typography",
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const webhookPayload = {
        type: "payment.succeeded",
        data: {
          payment_id: "pay_dodo_idempotent_event_999",
          order_id: "cks_dodo_session_999",
          total_amount: 30000, // $300.00
          currency: "USD",
          metadata: { brandId },
        },
      };

      // Delivery 1
      const res1 = await fulfillDodoPayment(webhookPayload);
      expect(res1.success).toBe(true);

      const brandAfter1 = db.getBrandById(brandId);
      expect(brandAfter1?.totalBid).toBe(300);
      expect(brandAfter1?.status).toBe("published");

      // Delivery 2 (Duplicate / Webhook retry)
      const res2 = await fulfillDodoPayment(webhookPayload);
      expect(res2.success).toBe(true);
      expect(res2.message).toContain("idempotent skip");

      const brandAfter2 = db.getBrandById(brandId);
      // Bid must remain exactly $300, NEVER $600
      expect(brandAfter2?.totalBid).toBe(300);

      // Bid history must only have 1 entry
      const history = db.getBidHistoryByBrandId(brandId);
      expect(history.length).toBe(1);
      expect(history[0].totalAfter).toBe(300);
    });
  });

  describe("Simultaneous Payments & Concurrent Rebids", () => {
    it("safely handles multiple concurrent payments on the same brand without race conditions", async () => {
      const brandId = "brand_concurrent_audit";
      db.insertBrand({
        id: brandId,
        websiteUrl: "https://concurrent-brand.com",
        canonicalUrl: "concurrent-brand.com",
        slug: "concurrent-brand",
        name: "Concurrent Brand",
        category: "Developer Tools",
        totalBid: 100, // Initial bid
        status: "published",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "hash_conc",
        template: "typography",
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Simulate 5 simultaneous payments dispatched concurrently via Promise.all
      const paymentPromises = [50, 100, 150, 200, 250].map((amt, idx) =>
        fulfillDodoPayment({
          type: "payment.succeeded",
          data: {
            payment_id: `pay_concurrent_txn_${idx}`,
            order_id: `cks_concurrent_${idx}`,
            total_amount: amt * 100,
            currency: "USD",
            metadata: { brandId },
          },
        })
      );

      const results = await Promise.all(paymentPromises);
      for (const res of results) {
        expect(res.success).toBe(true);
      }

      // Expected sum: 100 (initial) + 50 + 100 + 150 + 200 + 250 = 850
      const finalBrand = db.getBrandById(brandId);
      expect(finalBrand?.totalBid).toBe(850);

      const history = db.getBidHistoryByBrandId(brandId);
      expect(history.length).toBe(5);
    });

    it("safely recalculates rankings dynamically as concurrent bids arrive", async () => {
      const brandA = "brand_comp_a";
      const brandB = "brand_comp_b";

      db.insertBrand({
        id: brandA,
        websiteUrl: "https://brand-a.com",
        canonicalUrl: "brand-a.com",
        slug: "brand-a",
        name: "Brand A",
        category: "AI",
        totalBid: 200,
        status: "published",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "h_a",
        template: "typography",
        clickCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      });

      db.insertBrand({
        id: brandB,
        websiteUrl: "https://brand-b.com",
        canonicalUrl: "brand-b.com",
        slug: "brand-b",
        name: "Brand B",
        category: "AI",
        totalBid: 150,
        status: "published",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "h_b",
        template: "typography",
        clickCount: 0,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

      // Initially Brand A is #1 ($200) and Brand B is #2 ($150)
      let rankings = calculateRankings(db.getAllBrands());
      expect(rankings[0].id).toBe(brandA);
      expect(rankings[1].id).toBe(brandB);

      // Brand B executes a rebid of +$100 (total becomes $250)
      await fulfillDodoPayment({
        type: "payment.succeeded",
        data: {
          payment_id: "pay_brand_b_overtake",
          order_id: "cks_brand_b_overtake",
          total_amount: 10000, // $100
          currency: "USD",
          metadata: { brandId: brandB },
        },
      });

      // Brand B should now overtake Brand A and become #1
      rankings = calculateRankings(db.getAllBrands());
      expect(rankings[0].id).toBe(brandB);
      expect(rankings[0].totalBid).toBe(250);
      expect(rankings[1].id).toBe(brandA);
      expect(rankings[1].totalBid).toBe(200);
    });
  });

  describe("Payment Status Updates & Lifecycle", () => {
    it("updates payment status accurately without mutating brand bids on failure/cancellation", async () => {
      const brandId = "brand_status_audit";
      db.insertBrand({
        id: brandId,
        websiteUrl: "https://status-brand.com",
        canonicalUrl: "status-brand.com",
        slug: "status-brand",
        name: "Status Brand",
        category: "E-commerce",
        totalBid: 50,
        status: "published",
        logoUrl: null,
        description: null,
        tagline: null,
        managementTokenHash: "hash_status",
        template: "typography",
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Failed Payment
      const failedRes = await fulfillDodoPayment({
        type: "payment.failed",
        data: {
          payment_id: "pay_failed_attempt_1",
          order_id: "cks_failed_1",
          status: "failed",
          currency: "USD",
          metadata: { brandId },
        },
      });

      expect(failedRes.success).toBe(true);
      expect(failedRes.message).toContain("failed recorded. Bid was not increased");

      // Verify payment recorded as failed
      const payment = db.getPaymentByProviderId("pay_failed_attempt_1");
      expect(payment?.status).toBe("failed");
      expect(payment?.amount).toBe(0);

      // Brand bid must remain unchanged at 50
      const brand = db.getBrandById(brandId);
      expect(brand?.totalBid).toBe(50);
    });
  });
});
