-- ============================================================================
-- BrandBid Production Database Schema (PostgreSQL / Supabase)
-- ============================================================================

-- 1. Brands Table
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

-- Indexes for lightning fast queries and leaderboard calculation
CREATE INDEX IF NOT EXISTS idx_brands_status_total_bid ON brands(status, total_bid DESC);
CREATE INDEX IF NOT EXISTS idx_brands_canonical_url ON brands(canonical_url);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_token_hash ON brands(management_token_hash);

-- 2. Payments Table with STRICT UNIQUE CONSTRAINT on provider_payment_id
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

-- Payment Indexes for fast lookups and webhook verification
CREATE INDEX IF NOT EXISTS idx_payments_brand_id ON payments(brand_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_attempt_id ON payments(payment_attempt_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 3. Bid History Table (Audit Trail)
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

-- 4. Activity Table
CREATE TABLE IF NOT EXISTS activity (
  id VARCHAR(255) PRIMARY KEY,
  brand_id VARCHAR(255) NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);
