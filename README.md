# BrandBid.me — Public Brand Leaderboard

> **The more a website pays, the higher it ranks.**

BrandBid.me is an internet-native public leaderboard where brands and startups compete for ranking based on verified paid bids. The product combines editorial poster aesthetics with a transparent, competitive ranking game.

---

## Key Product Rules

1. **Ranking Rule**: Ranking is derived 100% from total verified paid bids (`total_bid DESC`).
2. **Deterministic Tie-Breaker**: If two brands have identical bids, the earlier verified payment gets the higher rank.
3. **Poster Hierarchy**:
   - `#1` — **Legendary** (Gold border, crown badge, dramatic typography, glowing presence)
   - `#2` — **Challenger** (Silver border and accents)
   - `#3` — **Contender** (Bronze border and accents)
   - `#4–10` — **Elite** (Medium-large multi-template editorial posters)
   - `#11–25` — **Featured** (Clean standard posters)
   - `#26–50` — **Standard** (Compact posters)
   - `#51+` — **Board** (Minimal listing row)
4. **No User Accounts**: Public users do not create accounts or passwords. Brand owners receive a cryptographically secure tokenized management link (`/manage/<token>`) upon claim.

---

## Tech Stack

- **Framework**: Next.js 15 App Router + React 19 + TypeScript
- **Styling**: Tailwind CSS + Custom CSS (`#F7F6F2` warm off-white, near-black, metallic accents)
- **Database**: Universal typed storage engine with atomic writes and PostgreSQL / SQLite schema
- **Payments**: Dodo Payments (Merchant of Record) + Checkout Sessions + Webhook Idempotency via `@dodopayments/nextjs`
- **Testing**: Vitest suite covering ranking, tie-breaks, payment idempotency, and URL canonicalization

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 3. Seed Development Data
Populates 26 realistic brands across all categories and tiers with verified payments and activity:
```bash
npm run db:seed
```

### 4. Run Test Suite
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/leaderboard` | `GET` | Ranked brands and platform statistics |
| `/api/brands/[slug]` | `GET`, `POST` | Brand details, climb gap, and click tracking |
| `/api/metadata` | `POST` | Best-effort website title, logo, and OG tag extractor |
| `/api/payments/create` | `POST` | Creates Dodo Payments checkout session for claim |
| `/api/payments/webhook` | `POST` | Cryptographically verified Dodo Payments webhook handler |
| `/api/payments/status` | `GET`, `POST` | Read-only payment and brand publication status query |
| `/api/bids/increase` | `POST` | Initiates rebid checkout session for existing brand |
| `/api/manage/[token]` | `GET`, `PUT` | Tokenized brand retrieval and detail editing |
| `/api/activity` | `GET` | Live platform activity ticker items |
| `/api/admin/stats` | `GET` | Admin metrics and payment history |
| `/api/admin/brands` | `POST` | Admin moderation actions (publish, suspend, delete) |

---

## Admin Console

Access the admin panel at `/admin` using the `ADMIN_SECRET` configured in `.env.local`:
```
Default secret: brandbid_admin_super_secret_key_2026
```

---

## Dodo Payments Configuration Guide

BrandBid uses **Dodo Payments** as its global Merchant of Record and payment provider.

### Required Environment Variables

```env
DODO_PAYMENTS_API_KEY=your_dodo_api_key
DODO_PAYMENTS_WEBHOOK_KEY=whsec_your_webhook_signing_key
DODO_PAYMENTS_PRODUCT_ID=pdt_your_product_id
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_RETURN_URL=http://localhost:3000/checkout/success
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Security Note**: Never expose `DODO_PAYMENTS_API_KEY` or `DODO_PAYMENTS_WEBHOOK_KEY` to client-side code (never prefix them with `NEXT_PUBLIC_`). All payments are finalized on the server via cryptographically verified webhooks.

---

### Step-by-Step Setup

#### 1. Creating and Configuring Test Credentials
1. Sign up or log into the [Dodo Payments Dashboard](https://app.dodopayments.com).
2. Ensure you are in **Test Mode** (toggle in the dashboard navigation).
3. Navigate to **Developer** -> **API Keys**.
4. Generate a new API key (e.g. `test_...`).
5. Copy the key and set it as `DODO_PAYMENTS_API_KEY` in your `.env.local` or hosting provider secrets.

#### 2. Setting the Dodo Product ID
1. In the Dodo dashboard, navigate to **Products** / **Catalog**.
2. Create a new product for BrandBid placement bids (e.g. name: "BrandBid Spot Placement", type: one-time payment or flexible bid).
3. Copy the generated product ID (e.g., `pdt_...`).
4. Set it as `DODO_PAYMENTS_PRODUCT_ID` in your environment.

#### 3. Configuring the Webhook Endpoint
Dodo must send events to your server when payments succeed.
- **Production URL**: `https://yourdomain.com/api/payments/webhook`
- **Local Development URL**: Use a tunneling tool (such as ngrok or Cloudflare Tunnel) to expose port 3000:
  ```bash
  ngrok http 3000
  ```
  Then register `https://<your-ngrok-subdomain>.ngrok-free.app/api/payments/webhook` in the Dodo dashboard under **Developer** -> **Webhooks**.
- Select events to listen for: `payment.succeeded`, `payment.failed`.

#### 4. Setting the Webhook Signing Key
1. When you create or inspect the webhook in the Dodo dashboard, copy the **Webhook Secret** (starts with `whsec_...`).
2. Add it to `.env.local` or production secrets:
   ```env
   DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
   ```
3. BrandBid automatically validates incoming requests using standard HMAC-SHA256 signature verification (`webhook-id`, `webhook-timestamp`, `webhook-signature`).

#### 5. Switching Between Test and Live Environments
- **For Development / Staging**:
  ```env
  DODO_PAYMENTS_ENVIRONMENT=test_mode
  DODO_PAYMENTS_API_KEY=test_...
  DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
  DODO_PAYMENTS_PRODUCT_ID=pdt_test_...
  DODO_PAYMENTS_RETURN_URL=http://localhost:3000/checkout/success
  ```
- **For Production**:
  1. Switch to **Live Mode** in your Dodo dashboard.
  2. Create a live product in the catalog and obtain live API keys (`live_...`) and a live webhook signing key (`whsec_...`).
  3. Configure your production environment variables (e.g., in Vercel, Supabase, or AWS):
     ```env
     DODO_PAYMENTS_ENVIRONMENT=live_mode
     DODO_PAYMENTS_API_KEY=live_...
     DODO_PAYMENTS_WEBHOOK_KEY=whsec_...
     DODO_PAYMENTS_PRODUCT_ID=pdt_live_...
     DODO_PAYMENTS_RETURN_URL=https://brandbid.me/checkout/success
     NEXT_PUBLIC_APP_URL=https://brandbid.me
     DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
     ```
