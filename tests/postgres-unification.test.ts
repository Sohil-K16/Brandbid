import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db, Brand, Payment } from "../lib/db";
import { fulfillDodoPayment } from "../lib/payments/fulfillment";
import { calculateRankings } from "../lib/ranking/ranking-engine";
import { closePostgresPool } from "../lib/db/postgres";

// In-memory store simulating PostgreSQL tables
interface PgState {
  brands: any[];
  payments: any[];
  bidHistory: any[];
  activity: any[];
}

let pgState: PgState = {
  brands: [],
  payments: [],
  bidHistory: [],
  activity: [],
};

// SQL engine simulation for PostgreSQL Pool
function createMockPool() {
  const queryFn = async (sql: string, params: any[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith("CREATE TABLE") || trimmed.startsWith("CREATE INDEX")) {
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith("TRUNCATE TABLE")) {
      pgState.brands = [];
      pgState.payments = [];
      pgState.bidHistory = [];
      pgState.activity = [];
      return { rows: [], rowCount: 0 };
    }

    if (trimmed.startsWith("BEGIN") || trimmed.startsWith("COMMIT") || trimmed.startsWith("ROLLBACK")) {
      return { rows: [], rowCount: 0 };
    }

    // SELECT FROM brands WHERE id = $1 [FOR UPDATE]
    if (trimmed.includes("FROM brands WHERE id = $1")) {
      const id = params[0];
      const match = pgState.brands.find((b) => b.id === id);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM brands WHERE LOWER(slug) = LOWER($1)
    if (trimmed.includes("LOWER(slug) = LOWER($1)")) {
      const slug = params[0].toLowerCase();
      const match = pgState.brands.find((b) => b.slug.toLowerCase() === slug);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM brands WHERE canonical_url = $1
    if (trimmed.includes("canonical_url = $1")) {
      const canonical = params[0];
      const match = pgState.brands.find((b) => b.canonical_url === canonical);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM brands WHERE management_token_hash = $1
    if (trimmed.includes("management_token_hash = $1")) {
      const tokenHash = params[0];
      const match = pgState.brands.find((b) => b.management_token_hash === tokenHash);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM brands WHERE status = 'published' AND total_bid > 0
    if (trimmed.includes("WHERE status = 'published' AND total_bid > 0")) {
      const list = pgState.brands
        .filter((b) => b.status === "published" && parseFloat(b.total_bid) > 0)
        .sort((a, b) => {
          const diff = parseFloat(b.total_bid) - parseFloat(a.total_bid);
          if (diff !== 0) return diff;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      return { rows: list, rowCount: list.length };
    }

    // SELECT * FROM brands ORDER BY total_bid DESC, created_at ASC
    if (trimmed.startsWith("SELECT * FROM brands")) {
      const list = [...pgState.brands].sort((a, b) => {
        const diff = parseFloat(b.total_bid) - parseFloat(a.total_bid);
        if (diff !== 0) return diff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      return { rows: list, rowCount: list.length };
    }

    // INSERT INTO brands
    if (trimmed.startsWith("INSERT INTO brands")) {
      const [
        id, website_url, canonical_url, slug, name, category,
        logo_url, description, tagline, total_bid, status,
        management_token_hash, template, click_count, created_at, updated_at
      ] = params;

      const row = {
        id, website_url, canonical_url, slug, name, category,
        logo_url, description, tagline,
        total_bid: String(total_bid),
        status,
        management_token_hash,
        template,
        click_count: Number(click_count || 0),
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString(),
      };

      const existingIdx = pgState.brands.findIndex((b) => b.id === id);
      if (existingIdx !== -1) {
        pgState.brands[existingIdx] = {
          ...pgState.brands[existingIdx],
          ...row,
          updated_at: new Date().toISOString(),
        };
        return { rows: [pgState.brands[existingIdx]], rowCount: 1 };
      } else {
        pgState.brands.push(row);
        return { rows: [row], rowCount: 1 };
      }
    }

    // UPDATE brands SET total_bid = $1, status = $2
    if (trimmed.includes("UPDATE brands SET total_bid = $1, status = $2")) {
      const [total_bid, status, _updated_at, id] = params;
      const targetId = id || _updated_at;
      const brand = pgState.brands.find((b) => b.id === targetId);
      if (brand) {
        brand.total_bid = String(total_bid);
        brand.status = status;
        brand.updated_at = new Date().toISOString();
      }
      return { rows: [], rowCount: brand ? 1 : 0 };
    }

    // UPDATE brands SET click_count = click_count + 1 WHERE id = $1
    if (trimmed.includes("click_count = click_count + 1")) {
      const id = params[0];
      const brand = pgState.brands.find((b) => b.id === id);
      if (brand) {
        brand.click_count = (brand.click_count || 0) + 1;
      }
      return { rows: [], rowCount: 1 };
    }

    // SELECT FROM payments WHERE provider_payment_id = $1
    if (trimmed.includes("FROM payments WHERE provider_payment_id = $1")) {
      const pid = params[0];
      const match = pgState.payments.find((p) => p.provider_payment_id === pid);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM payments WHERE payment_attempt_id = $1
    if (trimmed.includes("FROM payments WHERE payment_attempt_id = $1")) {
      const attId = params[0];
      const match = pgState.payments.find((p) => p.payment_attempt_id === attId);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }

    // SELECT FROM payments WHERE brand_id = $1
    if (trimmed.includes("FROM payments WHERE brand_id = $1")) {
      const bid = params[0];
      const list = pgState.payments.filter((p) => p.brand_id === bid);
      return { rows: list, rowCount: list.length };
    }

    // SELECT * FROM payments ORDER BY created_at DESC
    if (trimmed.startsWith("SELECT * FROM payments")) {
      return { rows: [...pgState.payments], rowCount: pgState.payments.length };
    }

    // INSERT INTO payments
    if (trimmed.startsWith("INSERT INTO payments")) {
      const [
        id, brand_id, provider, provider_payment_id, provider_session_id,
        provider_order_id, payment_attempt_id, amount, currency, status,
        created_at, verified_at
      ] = params;

      const row = {
        id, brand_id, provider, provider_payment_id, provider_session_id,
        provider_order_id, payment_attempt_id,
        amount: String(amount),
        currency,
        status,
        created_at: created_at || new Date().toISOString(),
        verified_at: verified_at || null,
      };

      const existingIdx = pgState.payments.findIndex((p) => p.provider_payment_id === provider_payment_id);
      if (existingIdx !== -1) {
        pgState.payments[existingIdx] = {
          ...pgState.payments[existingIdx],
          ...row,
        };
        return { rows: [pgState.payments[existingIdx]], rowCount: 1 };
      } else {
        pgState.payments.push(row);
        return { rows: [row], rowCount: 1 };
      }
    }

    // UPDATE payments SET status = $1, verified_at = $2 WHERE provider_payment_id = $3
    if (trimmed.includes("UPDATE payments SET status = $1")) {
      const [status, verified_at, provider_payment_id] = params;
      const payment = pgState.payments.find((p) => p.provider_payment_id === provider_payment_id);
      if (payment) {
        payment.status = status;
        payment.verified_at = verified_at;
        return { rows: [payment], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // SELECT FROM bid_history WHERE brand_id = $1
    if (trimmed.includes("FROM bid_history WHERE brand_id = $1")) {
      const brandId = params[0];
      const list = pgState.bidHistory
        .filter((h) => h.brand_id === brandId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { rows: list, rowCount: list.length };
    }

    // INSERT INTO bid_history
    if (trimmed.startsWith("INSERT INTO bid_history")) {
      const [
        id, brand_id, payment_id, amount, total_after,
        previous_total, previous_rank, new_rank, created_at
      ] = params;

      const row = {
        id, brand_id, payment_id,
        amount: String(amount),
        total_after: String(total_after),
        previous_total: String(previous_total || 0),
        previous_rank,
        new_rank,
        created_at: created_at || new Date().toISOString(),
      };

      pgState.bidHistory.push(row);
      return { rows: [row], rowCount: 1 };
    }

    // SELECT FROM activity
    if (trimmed.startsWith("SELECT * FROM activity")) {
      const limit = params[0] || 20;
      const list = [...pgState.activity]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
      return { rows: list, rowCount: list.length };
    }

    // INSERT INTO activity
    if (trimmed.startsWith("INSERT INTO activity")) {
      const [id, brand_id, event_type, metadata, created_at] = params;
      const row = {
        id, brand_id, event_type,
        metadata: typeof metadata === "string" ? metadata : JSON.stringify(metadata),
        created_at: created_at || new Date().toISOString(),
      };
      pgState.activity.push(row);
      return { rows: [row], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  };

  let txLock: Promise<void> = Promise.resolve();

  return {
    query: queryFn,
    connect: vi.fn().mockImplementation(async () => {
      let releaseTx: () => void;
      const nextTx = new Promise<void>((resolve) => {
        releaseTx = resolve;
      });
      const prevTx = txLock;
      txLock = nextTx;

      await prevTx;
      return {
        query: queryFn,
        release: () => {
          releaseTx!();
        },
      };
    }),
    end: vi.fn().mockResolvedValue(undefined),
  };
}

// Mock 'pg' module to return mock pool
const mockPool = createMockPool();
vi.mock("pg", () => {
  return {
    Pool: vi.fn().mockImplementation(() => mockPool),
  };
});

describe("PostgreSQL/Supabase Single Source of Truth Architecture", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(async () => {
    // Configure PostgreSQL environment variable
    process.env.DATABASE_URL = "postgres://postgres:postgres_pw@supabase.co:5432/brandbid";
    await closePostgresPool();
    await db.clearAll();
  });

  afterEach(async () => {
    process.env.DATABASE_URL = originalEnv;
    await closePostgresPool();
  });

  it("1. Confirms db delegates all read and write queries to PostgreSQL when DATABASE_URL is set", async () => {
    expect(db.isPostgres()).toBe(true);

    const now = new Date().toISOString();
    const testBrand: Brand = {
      id: "brand_pg_truth_1",
      websiteUrl: "https://pg-truth.io",
      canonicalUrl: "pg-truth.io",
      slug: "pg-truth",
      name: "PostgreSQL Truth Brand",
      category: "Fintech",
      logoUrl: null,
      description: "Testing single source of truth",
      tagline: "Always PostgreSQL",
      totalBid: 1500,
      status: "published",
      managementTokenHash: "hash_pg_secret",
      template: "editorial",
      clickCount: 5,
      createdAt: now,
      updatedAt: now,
    };

    // Write to PostgreSQL
    const inserted = await db.insertBrand(testBrand);
    expect(inserted.id).toBe("brand_pg_truth_1");

    // Verify it exists in PostgreSQL state
    expect(pgState.brands).toHaveLength(1);
    expect(pgState.brands[0].id).toBe("brand_pg_truth_1");

    // Read back via unified db reads
    const byId = await db.getBrandById("brand_pg_truth_1");
    expect(byId).not.toBeNull();
    expect(byId?.totalBid).toBe(1500);

    const bySlug = await db.getBrandBySlug("pg-truth");
    expect(bySlug).not.toBeNull();
    expect(bySlug?.id).toBe("brand_pg_truth_1");

    const allBrands = await db.getAllBrands();
    expect(allBrands).toHaveLength(1);
    expect(allBrands[0].name).toBe("PostgreSQL Truth Brand");

    const published = await db.getPublishedBrands();
    expect(published).toHaveLength(1);
  });

  it("2. Dodo webhook writes to PostgreSQL and immediately updates leaderboard reads", async () => {
    const brandId = "brand_dodo_pg_1";
    await db.insertBrand({
      id: brandId,
      name: "Dodo PG Brand",
      websiteUrl: "https://dodo-pg.com",
      canonicalUrl: "dodo-pg.com",
      slug: "dodo-pg",
      category: "AI",
      totalBid: 0,
      status: "pending",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "token_hash_dodo",
      template: "typography",
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Webhook delivers $2,500.00 payment
    const paymentId = "pay_dodo_pg_evt_100";
    const webhookPayload = {
      type: "payment.succeeded",
      data: {
        payment_id: paymentId,
        session_id: "cks_pg_session_1",
        total_amount: 250000, // $2,500 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId,
          brandName: "Dodo PG Brand",
        },
      },
    };

    const fulfillRes = await fulfillDodoPayment(webhookPayload);
    expect(fulfillRes.success).toBe(true);
    expect(fulfillRes.amount).toBe(2500);

    // Verify written to PostgreSQL payments table
    expect(pgState.payments).toHaveLength(1);
    expect(pgState.payments[0].provider_payment_id).toBe(paymentId);
    expect(pgState.payments[0].status).toBe("verified");
    expect(parseFloat(pgState.payments[0].amount)).toBe(2500);

    // Verify brand total_bid in PostgreSQL is 2500
    const updatedBrand = await db.getBrandById(brandId);
    expect(updatedBrand?.totalBid).toBe(2500);
    expect(updatedBrand?.status).toBe("published");

    // Verify leaderboard query immediately shows brand with rank #1
    const allBrands = await db.getAllBrands();
    const rankings = calculateRankings(allBrands);
    expect(rankings[0].id).toBe(brandId);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].totalBid).toBe(2500);
  });

  it("3. Rebid flow: updates PostgreSQL brand total_bid and immediately reflects on leaderboard", async () => {
    const brandId = "brand_rebid_pg_2";
    await db.insertBrand({
      id: brandId,
      name: "Existing Brand",
      websiteUrl: "https://existing-pg.com",
      canonicalUrl: "existing-pg.com",
      slug: "existing-pg",
      category: "Developer Tools",
      totalBid: 500, // Starting at $500
      status: "published",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "token_rebid",
      template: "typography",
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Rebid of $300 arrives
    const rebidWebhook = {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_rebid_pg_evt_200",
        session_id: "cks_rebid_pg_2",
        total_amount: 30000, // $300 in cents
        currency: "USD",
        status: "succeeded",
        metadata: {
          brandId,
          brandName: "Existing Brand",
          isRebid: "true",
        },
      },
    };

    const rebidResult = await fulfillDodoPayment(rebidWebhook);
    expect(rebidResult.success).toBe(true);

    // Total must now be $500 + $300 = $800 in PostgreSQL
    const brandAfterRebid = await db.getBrandById(brandId);
    expect(brandAfterRebid?.totalBid).toBe(800);

    // Leaderboard reads reflect exact new total
    const boardBrands = await db.getAllBrands();
    const ranked = calculateRankings(boardBrands);
    expect(ranked.find((b) => b.id === brandId)?.totalBid).toBe(800);

    // Bid history audit trail written to PostgreSQL
    const history = await db.getBidHistoryByBrandId(brandId);
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(300);
    expect(history[0].totalAfter).toBe(800);
  });

  it("4. Payment written to PostgreSQL is visible through all page and API read queries", async () => {
    const brandId = "brand_pg_api_visibility";
    const managementTokenHash = "mgt_hash_visible_123";

    await db.insertBrand({
      id: brandId,
      name: "API Visibility Brand",
      websiteUrl: "https://apivis.com",
      canonicalUrl: "apivis.com",
      slug: "api-vis",
      category: "Agency",
      totalBid: 1200,
      status: "published",
      logoUrl: "https://apivis.com/logo.png",
      description: "Visible across all API routes",
      tagline: "Total PostgreSQL visibility",
      managementTokenHash,
      template: "editorial",
      clickCount: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const paymentRecord: Payment = {
      id: "pay_vis_1",
      brandId,
      provider: "dodo",
      providerPaymentId: "dodo_pay_vis_1",
      providerSessionId: "cks_vis_1",
      providerOrderId: "cks_vis_1",
      paymentAttemptId: "att_vis_1",
      amount: 1200,
      currency: "USD",
      status: "verified",
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
    };
    await db.insertPayment(paymentRecord);

    // Check all API read functions against PostgreSQL
    const byId = await db.getBrandById(brandId);
    expect(byId).not.toBeNull();
    expect(byId?.id).toBe(brandId);

    const bySlug = await db.getBrandBySlug("api-vis");
    expect(bySlug).not.toBeNull();
    expect(bySlug?.id).toBe(brandId);

    const byCanonical = await db.getBrandByCanonicalUrl("apivis.com");
    expect(byCanonical).not.toBeNull();
    expect(byCanonical?.id).toBe(brandId);

    const byToken = await db.getBrandByTokenHash(managementTokenHash);
    expect(byToken).not.toBeNull();
    expect(byToken?.id).toBe(brandId);

    const payments = await db.getPaymentsByBrandId(brandId);
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(1200);

    const byProviderId = await db.getPaymentByProviderId("dodo_pay_vis_1");
    expect(byProviderId).not.toBeNull();
    expect(byProviderId?.providerPaymentId).toBe("dodo_pay_vis_1");

    const byAttemptId = await db.getPaymentByAttemptId("att_vis_1");
    expect(byAttemptId).not.toBeNull();
    expect(byAttemptId?.paymentAttemptId).toBe("att_vis_1");
  });

  it("5. Duplicate webhook does not double-credit in PostgreSQL", async () => {
    const brandId = "brand_pg_duplicate_test";
    await db.insertBrand({
      id: brandId,
      name: "Duplicate Safety PG Brand",
      websiteUrl: "https://pg-dup.com",
      canonicalUrl: "pg-dup.com",
      slug: "pg-dup",
      category: "SaaS",
      totalBid: 100,
      status: "published",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "h_dup",
      template: "minimal",
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const duplicatePaymentId = "pay_dodo_pg_duplicate_key";
    const webhook = {
      type: "payment.succeeded",
      data: {
        payment_id: duplicatePaymentId,
        session_id: "cks_pg_dup_session",
        total_amount: 40000, // $400
        currency: "USD",
        status: "succeeded",
        metadata: { brandId },
      },
    };

    // First arrival
    const res1 = await fulfillDodoPayment(webhook);
    expect(res1.success).toBe(true);
    expect(res1.amount).toBe(400);

    const afterFirst = await db.getBrandById(brandId);
    expect(afterFirst?.totalBid).toBe(500); // 100 + 400

    // Duplicate webhook arrival (network retry / replay)
    const res2 = await fulfillDodoPayment(webhook);
    expect(res2.success).toBe(true);
    expect(res2.message).toContain("idempotent skip");

    // Brand bid in PostgreSQL must strictly stay 500, never 900
    const afterSecond = await db.getBrandById(brandId);
    expect(afterSecond?.totalBid).toBe(500);

    // Only one payment row in PostgreSQL
    const matchingPayments = (await db.getAllPayments()).filter(
      (p) => p.providerPaymentId === duplicatePaymentId
    );
    expect(matchingPayments).toHaveLength(1);
  });

  it("6. Concurrent payments to PostgreSQL are handled safely without lost updates", async () => {
    const brandId = "brand_pg_concurrent_test";
    await db.insertBrand({
      id: brandId,
      name: "Concurrent PG Brand",
      websiteUrl: "https://pg-concurrent.com",
      canonicalUrl: "pg-concurrent.com",
      slug: "pg-concurrent",
      category: "Developer Tools",
      totalBid: 100, // initial $100
      status: "published",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "h_conc_pg",
      template: "typography",
      clickCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4 simultaneous payments: $50, $100, $150, $200
    const amounts = [50, 100, 150, 200];
    const promises = amounts.map((amt, idx) =>
      fulfillDodoPayment({
        type: "payment.succeeded",
        data: {
          payment_id: `pay_pg_concurrent_${idx}`,
          session_id: `cks_pg_concurrent_${idx}`,
          total_amount: amt * 100,
          currency: "USD",
          status: "succeeded",
          metadata: { brandId },
        },
      })
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.success).toBe(true);
    }

    // Initial $100 + $50 + $100 + $150 + $200 = $600
    const finalBrand = await db.getBrandById(brandId);
    expect(finalBrand?.totalBid).toBe(600);

    const history = await db.getBidHistoryByBrandId(brandId);
    expect(history).toHaveLength(4);
  });

  it("7. Management-token updates and claims write directly to PostgreSQL and persist", async () => {
    const brandId = "brand_pg_claim_mgmt";
    const tokenHash = "claim_token_hash_secret_999";

    await db.insertBrand({
      id: brandId,
      name: "Unclaimed Brand",
      websiteUrl: "https://unclaimed-pg.com",
      canonicalUrl: "unclaimed-pg.com",
      slug: "unclaimed-pg",
      category: "E-commerce",
      totalBid: 750,
      status: "published",
      logoUrl: null,
      description: "Original description",
      tagline: "Original tagline",
      managementTokenHash: tokenHash,
      template: "minimal",
      clickCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Brand owner retrieves their brand via management token
    const brandForOwner = await db.getBrandByTokenHash(tokenHash);
    expect(brandForOwner).not.toBeNull();
    expect(brandForOwner?.name).toBe("Unclaimed Brand");

    // Brand owner updates their brand info
    const updated = await db.updateBrand(brandId, {
      name: "Claimed & Customized Brand",
      description: "Updated by owner via management portal",
      tagline: "New Slogan",
      template: "editorial",
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe("Claimed & Customized Brand");
    expect(updated?.description).toBe("Updated by owner via management portal");

    // Verify immediate PostgreSQL read reflects the updates
    const refreshed = await db.getBrandById(brandId);
    expect(refreshed?.name).toBe("Claimed & Customized Brand");
    expect(refreshed?.template).toBe("editorial");
    expect(refreshed?.totalBid).toBe(750); // Bid was preserved
  });

  it("8. Preserves deterministic tie-breaking rules in PostgreSQL leaderboard reads", async () => {
    const brandEarly = "brand_tie_early";
    const brandLate = "brand_tie_late";

    // Both brands have the identical bid ($500), but brandEarly was created earlier
    await db.insertBrand({
      id: brandEarly,
      name: "Early Brand",
      websiteUrl: "https://early.com",
      canonicalUrl: "early.com",
      slug: "early-brand",
      category: "AI",
      totalBid: 500,
      status: "published",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "h_early",
      template: "typography",
      clickCount: 0,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });

    await db.insertBrand({
      id: brandLate,
      name: "Late Brand",
      websiteUrl: "https://late.com",
      canonicalUrl: "late.com",
      slug: "late-brand",
      category: "AI",
      totalBid: 500,
      status: "published",
      logoUrl: null,
      description: null,
      tagline: null,
      managementTokenHash: "h_late",
      template: "typography",
      clickCount: 0,
      createdAt: "2026-01-02T10:00:00.000Z",
      updatedAt: "2026-01-02T10:00:00.000Z",
    });

    const boardBrands = await db.getAllBrands();
    const ranked = calculateRankings(boardBrands);

    // brandEarly must be #1, brandLate must be #2
    expect(ranked[0].id).toBe(brandEarly);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].id).toBe(brandLate);
    expect(ranked[1].rank).toBe(2);
  });
});
