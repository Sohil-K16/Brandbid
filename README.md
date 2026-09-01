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
- **Payments**: Razorpay SDK + Server-side HMAC SHA-256 signature verification + Webhook idempotency
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
| `/api/payments/create` | `POST` | Creates Razorpay order for claim or rebid |
| `/api/payments/verify` | `POST` | Server-side signature verification, atomic balance update |
| `/api/payments/webhook` | `POST` | Idempotent webhook listener |
| `/api/bids/increase` | `POST` | Initiates rebid for existing brand |
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
