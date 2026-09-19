import { Pool, PoolClient } from "pg";
import { Brand, Payment, BidHistoryItem, ActivityItem } from "./schema";
import { calculateRankings } from "../ranking/ranking-engine";
import { assessBrandSafety } from "../security/url-security";
import crypto from "crypto";

let pool: Pool | null = null;
let isInitialized = false;

/**
 * Returns whether a PostgreSQL database URL is configured.
 */
export function isPostgresConfigured(): boolean {
  const url = process.env.DATABASE_URL || "";
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

/**
 * Gets or creates the PostgreSQL connection pool.
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || "";
  const isRemote =
    connectionString.includes("supabase.co") ||
    connectionString.includes("aws.neon.tech") ||
    connectionString.includes("amazonaws.com") ||
    connectionString.includes("render.com");

  pool = new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

/**
 * Initializes the database schema, creating tables, indexes, and unique constraints.
 */
export async function initPostgresSchema(): Promise<void> {
  if (isInitialized) return;
  const p = getPostgresPool();
  const client = await p.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id VARCHAR(255) PRIMARY KEY,
        website_url TEXT NOT NULL,
        canonical_url TEXT NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        logo_url TEXT,
        description TEXT,
        tagline TEXT,
        total_bid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        management_token_hash VARCHAR(255) NOT NULL,
        template VARCHAR(50) NOT NULL DEFAULT 'typography',
        click_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_brands_status_total_bid ON brands(status, total_bid DESC);
      CREATE INDEX IF NOT EXISTS idx_brands_canonical_url ON brands(canonical_url);
      CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
      CREATE INDEX IF NOT EXISTS idx_brands_token_hash ON brands(management_token_hash);

      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        brand_id VARCHAR(255) NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL DEFAULT 'dodo',
        provider_payment_id VARCHAR(255) NOT NULL UNIQUE,
        provider_session_id VARCHAR(255),
        provider_order_id VARCHAR(255),
        payment_attempt_id VARCHAR(255),
        amount NUMERIC(14, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_payments_brand_id ON payments(brand_id);
      CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_attempt_id ON payments(payment_attempt_id);

      CREATE TABLE IF NOT EXISTS bid_history (
        id VARCHAR(255) PRIMARY KEY,
        brand_id VARCHAR(255) NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        payment_id VARCHAR(255) REFERENCES payments(id) ON DELETE SET NULL,
        amount NUMERIC(14, 2) NOT NULL,
        total_after NUMERIC(14, 2) NOT NULL,
        previous_total NUMERIC(14, 2) DEFAULT 0.00,
        previous_rank INTEGER,
        new_rank INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bid_history_brand_id ON bid_history(brand_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS activity (
        id VARCHAR(255) PRIMARY KEY,
        brand_id VARCHAR(255) NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);
    `);
    isInitialized = true;
  } finally {
    client.release();
  }
}

/**
 * Executes a callback inside an atomic PostgreSQL transaction.
 */
export async function withPostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPostgresPool();
  const client = await p.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

function mapBrandRow(row: any): Brand {
  return {
    id: row.id,
    websiteUrl: row.website_url,
    canonicalUrl: row.canonical_url,
    slug: row.slug,
    name: row.name,
    category: row.category,
    logoUrl: row.logo_url,
    description: row.description,
    tagline: row.tagline,
    totalBid: parseFloat(row.total_bid) || 0,
    status: row.status,
    managementTokenHash: row.management_token_hash,
    template: row.template,
    clickCount: parseInt(row.click_count, 10) || 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapPaymentRow(row: any): Payment {
  return {
    id: row.id,
    brandId: row.brand_id,
    provider: row.provider || "dodo",
    providerPaymentId: row.provider_payment_id,
    providerSessionId: row.provider_session_id || undefined,
    providerOrderId: row.provider_order_id,
    paymentAttemptId: row.payment_attempt_id || undefined,
    amount: parseFloat(row.amount) || 0,
    currency: row.currency || "USD",
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
  };
}

function mapBidHistoryRow(row: any): BidHistoryItem {
  const amount = parseFloat(row.amount) || 0;
  const totalAfter = parseFloat(row.total_after) || 0;
  return {
    id: row.id,
    brandId: row.brand_id,
    paymentId: row.payment_id,
    amount,
    totalAfter,
    amountAdded: amount,
    previousTotal: parseFloat(row.previous_total) || 0,
    newTotal: totalAfter,
    previousRank: row.previous_rank ? parseInt(row.previous_rank, 10) : null,
    newRank: row.new_rank ? parseInt(row.new_rank, 10) : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapActivityRow(row: any): ActivityItem {
  return {
    id: row.id,
    brandId: row.brand_id,
    eventType: row.event_type,
    metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export const postgresDb = {
  async getAllBrands(): Promise<Brand[]> {
    const res = await getPostgresPool().query("SELECT * FROM brands ORDER BY total_bid DESC, created_at ASC");
    return res.rows.map(mapBrandRow);
  },

  async getPublishedBrands(): Promise<Brand[]> {
    const res = await getPostgresPool().query(
      "SELECT * FROM brands WHERE status = 'published' AND total_bid > 0 ORDER BY total_bid DESC, created_at ASC"
    );
    return res.rows.map(mapBrandRow);
  },

  async getBrandById(id: string): Promise<Brand | null> {
    const res = await getPostgresPool().query("SELECT * FROM brands WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return mapBrandRow(res.rows[0]);
  },

  async getBrandBySlug(slug: string): Promise<Brand | null> {
    const res = await getPostgresPool().query("SELECT * FROM brands WHERE LOWER(slug) = LOWER($1)", [slug]);
    if (res.rows.length === 0) return null;
    return mapBrandRow(res.rows[0]);
  },

  async getBrandByCanonicalUrl(canonicalUrl: string): Promise<Brand | null> {
    const res = await getPostgresPool().query("SELECT * FROM brands WHERE canonical_url = $1", [canonicalUrl]);
    if (res.rows.length === 0) return null;
    return mapBrandRow(res.rows[0]);
  },

  async getBrandByTokenHash(tokenHash: string): Promise<Brand | null> {
    const res = await getPostgresPool().query("SELECT * FROM brands WHERE management_token_hash = $1", [tokenHash]);
    if (res.rows.length === 0) return null;
    return mapBrandRow(res.rows[0]);
  },

  async insertBrand(brand: Brand): Promise<Brand> {
    const query = `
      INSERT INTO brands (
        id, website_url, canonical_url, slug, name, category,
        logo_url, description, tagline, total_bid, status,
        management_token_hash, template, click_count, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        website_url = EXCLUDED.website_url,
        canonical_url = EXCLUDED.canonical_url,
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        logo_url = EXCLUDED.logo_url,
        description = EXCLUDED.description,
        tagline = EXCLUDED.tagline,
        total_bid = EXCLUDED.total_bid,
        status = EXCLUDED.status,
        management_token_hash = EXCLUDED.management_token_hash,
        template = EXCLUDED.template,
        click_count = EXCLUDED.click_count,
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      brand.id,
      brand.websiteUrl,
      brand.canonicalUrl,
      brand.slug,
      brand.name,
      brand.category,
      brand.logoUrl,
      brand.description,
      brand.tagline,
      brand.totalBid,
      brand.status,
      brand.managementTokenHash,
      brand.template,
      brand.clickCount,
      brand.createdAt,
      brand.updatedAt,
    ];
    const res = await getPostgresPool().query(query, values);
    return mapBrandRow(res.rows[0]);
  },

  async updateBrand(id: string, updates: Partial<Brand>): Promise<Brand | null> {
    const current = await this.getBrandById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    return await this.insertBrand(merged);
  },

  async incrementBrandClicks(id: string): Promise<void> {
    await getPostgresPool().query("UPDATE brands SET click_count = click_count + 1 WHERE id = $1", [id]);
  },

  async getAllPayments(): Promise<Payment[]> {
    const res = await getPostgresPool().query("SELECT * FROM payments ORDER BY created_at DESC");
    return res.rows.map(mapPaymentRow);
  },

  async getPaymentByProviderId(providerPaymentId: string): Promise<Payment | null> {
    const res = await getPostgresPool().query("SELECT * FROM payments WHERE provider_payment_id = $1", [
      providerPaymentId,
    ]);
    if (res.rows.length === 0) return null;
    return mapPaymentRow(res.rows[0]);
  },

  async getPaymentByAttemptId(paymentAttemptId: string): Promise<Payment | null> {
    const res = await getPostgresPool().query("SELECT * FROM payments WHERE payment_attempt_id = $1", [
      paymentAttemptId,
    ]);
    if (res.rows.length === 0) return null;
    return mapPaymentRow(res.rows[0]);
  },

  async getPaymentsByBrandId(brandId: string): Promise<Payment[]> {
    const res = await getPostgresPool().query("SELECT * FROM payments WHERE brand_id = $1 ORDER BY created_at DESC", [
      brandId,
    ]);
    return res.rows.map(mapPaymentRow);
  },

  async insertPayment(payment: Payment): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        id, brand_id, provider, provider_payment_id, provider_session_id,
        provider_order_id, payment_attempt_id, amount, currency, status, created_at, verified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (provider_payment_id) DO UPDATE SET
        status = EXCLUDED.status,
        verified_at = EXCLUDED.verified_at,
        amount = EXCLUDED.amount,
        payment_attempt_id = COALESCE(EXCLUDED.payment_attempt_id, payments.payment_attempt_id)
      RETURNING *;
    `;
    const values = [
      payment.id,
      payment.brandId,
      payment.provider || "dodo",
      payment.providerPaymentId,
      payment.providerSessionId || null,
      payment.providerOrderId,
      payment.paymentAttemptId || null,
      payment.amount,
      payment.currency || "USD",
      payment.status,
      payment.createdAt,
      payment.verifiedAt || null,
    ];
    const res = await getPostgresPool().query(query, values);
    return mapPaymentRow(res.rows[0]);
  },

  async updatePaymentStatus(
    providerPaymentId: string,
    status: Payment["status"],
    verifiedAt: string | null = null
  ): Promise<Payment | null> {
    const res = await getPostgresPool().query(
      "UPDATE payments SET status = $1, verified_at = $2 WHERE provider_payment_id = $3 RETURNING *",
      [status, verifiedAt, providerPaymentId]
    );
    if (res.rows.length === 0) return null;
    return mapPaymentRow(res.rows[0]);
  },

  async getBidHistoryByBrandId(brandId: string): Promise<BidHistoryItem[]> {
    const res = await getPostgresPool().query(
      "SELECT * FROM bid_history WHERE brand_id = $1 ORDER BY created_at DESC",
      [brandId]
    );
    return res.rows.map(mapBidHistoryRow);
  },

  async insertBidHistory(item: BidHistoryItem): Promise<BidHistoryItem> {
    const query = `
      INSERT INTO bid_history (
        id, brand_id, payment_id, amount, total_after,
        previous_total, previous_rank, new_rank, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const amount = item.amount ?? item.amountAdded ?? 0;
    const totalAfter = item.totalAfter ?? item.newTotal ?? 0;
    const values = [
      item.id,
      item.brandId,
      item.paymentId || null,
      amount,
      totalAfter,
      item.previousTotal ?? 0,
      item.previousRank ?? null,
      item.newRank ?? null,
      item.createdAt,
    ];
    const res = await getPostgresPool().query(query, values);
    return mapBidHistoryRow(res.rows[0]);
  },

  async getActivity(limit = 20): Promise<ActivityItem[]> {
    const res = await getPostgresPool().query("SELECT * FROM activity ORDER BY created_at DESC LIMIT $1", [limit]);
    return res.rows.map(mapActivityRow);
  },

  async insertActivity(item: ActivityItem): Promise<ActivityItem> {
    const query = `
      INSERT INTO activity (id, brand_id, event_type, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [
      item.id,
      item.brandId,
      item.eventType,
      JSON.stringify(item.metadata || {}),
      item.createdAt,
    ];
    const res = await getPostgresPool().query(query, values);
    return mapActivityRow(res.rows[0]);
  },

  /**
   * Production-grade ACID fulfillment transaction with row-level locking.
   * Handles:
   * 1. Check whether payment already exists (FOR UPDATE lock)
   * 2. Idempotency skip if already verified
   * 3. Row lock on brand to prevent race conditions during concurrent rebids/payments
   * 4. Insert payment with UNIQUE constraint on provider_payment_id
   * 5. Atomically increment brand total_bid
   * 6. Insert audit trail in bid_history
   * 7. Insert activity record
   * 8. Commit
   */
  async fulfillPaymentInTransaction(params: {
    brandId: string;
    providerPaymentId: string;
    providerOrderId: string;
    providerSessionId?: string;
    paymentAttemptId?: string;
    amount: number;
    currency: string;
  }): Promise<{
    success: boolean;
    message?: string;
    paymentId?: string;
    brandId?: string;
    amount?: number;
  }> {
    const {
      brandId,
      providerPaymentId,
      providerOrderId,
      providerSessionId,
      paymentAttemptId,
      amount,
      currency,
    } = params;

    return await withPostgresTransaction(async (client) => {
      // 1. Check whether payment already exists with row-level lock
      const existingRes = await client.query(
        "SELECT * FROM payments WHERE provider_payment_id = $1 FOR UPDATE",
        [providerPaymentId]
      );

      if (existingRes.rows.length > 0 && existingRes.rows[0].status === "verified") {
        return {
          success: true,
          message: "Payment already processed (idempotent skip)",
          paymentId: existingRes.rows[0].id,
          brandId,
          amount,
        };
      }

      // 2. Lock brand row FOR UPDATE (prevents race conditions across simultaneous rebids)
      const brandRes = await client.query(
        "SELECT * FROM brands WHERE id = $1 FOR UPDATE",
        [brandId]
      );

      if (brandRes.rows.length === 0) {
        return { success: false, message: `Brand not found: ${brandId}` };
      }

      const brand = mapBrandRow(brandRes.rows[0]);
      const previousTotal = brand.totalBid;
      const newTotal = Math.round((previousTotal + amount) * 100) / 100;
      const now = new Date().toISOString();

      // 3. Evaluate safety check
      const safetyCheck = assessBrandSafety(brand.websiteUrl, brand.name, brand.description || "");
      const shouldPublish = brand.status === "published" || safetyCheck.safe;
      const finalStatus = shouldPublish ? "published" : "pending";

      // 4. Insert Payment record (strict UNIQUE constraint on provider_payment_id)
      const paymentId = existingRes.rows[0]?.id || "pay_" + crypto.randomBytes(8).toString("hex");
      await client.query(
        `INSERT INTO payments (
          id, brand_id, provider, provider_payment_id, provider_session_id,
          provider_order_id, payment_attempt_id, amount, currency, status, created_at, verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (provider_payment_id) DO UPDATE SET
          status = EXCLUDED.status,
          verified_at = EXCLUDED.verified_at,
          amount = EXCLUDED.amount`,
        [
          paymentId,
          brand.id,
          "dodo",
          providerPaymentId,
          providerSessionId || providerOrderId,
          providerOrderId,
          paymentAttemptId || null,
          amount,
          currency || "USD",
          "verified",
          now,
          now,
        ]
      );

      // 5. Update brand total & status
      await client.query(
        "UPDATE brands SET total_bid = $1, status = $2, updated_at = $3 WHERE id = $4",
        [newTotal, finalStatus, now, brand.id]
      );

      if (!shouldPublish) {
        return {
          success: true,
          message: `Payment verified. Brand held in pending status for moderation review: ${safetyCheck.reason}`,
          paymentId,
          brandId,
          amount,
        };
      }

      // 6. Insert bid history
      const historyId = "hist_" + crypto.randomBytes(8).toString("hex");
      await client.query(
        `INSERT INTO bid_history (
          id, brand_id, payment_id, amount, total_after, previous_total, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [historyId, brand.id, paymentId, amount, newTotal, previousTotal, now]
      );

      // 7. Insert activity record
      const activityId = "act_" + crypto.randomBytes(8).toString("hex");
      const activityType = previousTotal === 0 ? "brand_entered" : "bid_increased";
      await client.query(
        `INSERT INTO activity (id, brand_id, event_type, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5)`,
        [
          activityId,
          brand.id,
          activityType,
          JSON.stringify({
            brandName: brand.name,
            amountAdded: amount,
            totalBid: newTotal,
            slug: brand.slug,
          }),
          now,
        ]
      );

      return {
        success: true,
        message: "Payment successfully fulfilled inside PostgreSQL transaction",
        paymentId,
        brandId,
        amount,
      };
    });
  },
};
