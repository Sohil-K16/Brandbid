BrandBid.me — Technical Stack & Architecture Document
Version: 1.0Status: MVP Technical SpecificationProduct: BrandBid.meArchitecture principle: Keep it lean, secure, and easy to scale.

1. Technical Philosophy
BrandBid is intentionally a small, focused product.
The technical architecture should reflect that.
We do not need:
microservices 
Kubernetes 
a separate frontend and backend 
traditional user authentication 
Redis from day one 
WebSockets from day one 
complicated infrastructure 
The preferred architecture is:
One Next.js application + PostgreSQL + payment provider.
This keeps development fast while still giving us proper transactional handling for payments and rankings.

2. Recommended Stack
Layer
Technology
Purpose
Framework
Next.js 16
Full-stack web application
Language
TypeScript
Type safety
UI
React
Interactive interface
Styling
Tailwind CSS
Layout and responsive styling
Custom styling
CSS
Poster-specific designs/animations
Backend
Next.js Route Handlers
API/server logic
Database
PostgreSQL
Brands, bids, payments, rankings
Database platform
Supabase
Managed PostgreSQL
ORM
Drizzle ORM
Type-safe database access
Payments
Razorpay
Initial payment processing
Authentication
None for public users
Frictionless participation
Brand management
Secure token/link
Manage listing without account
File storage
Supabase Storage
Logos/assets when required
Deployment
Vercel
Application hosting
Analytics
PostHog
Product analytics
Monitoring
Sentry
Error tracking
Validation
Zod
Input/API validation
Testing
Vitest + Playwright
Unit + E2E testing
Source control
GitHub
Code/version control

3. Frontend
Next.js + React + TypeScript
Next.js should be the foundation of the application.
Why?
BrandBid has several types of pages:
/
 /brand/[slug]
 /claim
 /success
 /manage/[token]
 /admin
It also benefits from:
server-rendered public pages 
SEO 
dynamic metadata 
Open Graph images 
fast initial loads 
client-side interactions 
API routes 
Next.js gives us all of these within one application.

4. Why Not React + Vite?
React + Vite would work technically.
However, BrandBid has public, indexable pages such as:
brandbid.me/brand/acme
Those pages should be optimized for:
search engines 
social sharing 
fast initial rendering 
dynamic metadata 
Next.js is therefore the better overall choice.

5. TypeScript
Use TypeScript throughout the project.
Important domain types include:
Brand
Bid
Payment
Category
Activity
Ranking
PosterTier
Example:
type Brand = {
  id: string;
  name: string;
  websiteUrl: string;
  category: string;
  totalBid: number;
  rank: number;
};
TypeScript is particularly valuable around payment and ranking logic because mistakes there can have financial consequences.

6. Styling
Tailwind CSS
Use Tailwind for:
layout 
spacing 
responsive design 
typography 
forms 
basic components 
But the poster system should use custom CSS where appropriate.
BrandBid's visual identity shouldn't be constrained by a generic component library.

7. UI Components
Use custom components rather than a large UI framework.
Core components:
Header
Hero
Leaderboard
BrandPoster
RankBadge
BidAmount
CategoryBadge
ActivityFeed
ClaimForm
BidForm
PaymentConfirmation
BrandDetail
ShareButton
The most important component is:
BrandPoster
It should accept data such as:
<BrandPoster
  brand={brand}
  rank={rank}
  bid={bid}
  tier={posterTier}
/>
The component then determines the appropriate visual treatment.

8. Backend
Next.js Route Handlers
A separate Express backend is unnecessary for the MVP.
The application can expose APIs such as:
GET  /api/leaderboard
GET  /api/brands/[slug]

POST /api/claim
POST /api/payment/create
POST /api/payment/webhook

POST /api/bid/increase
This keeps frontend and backend in one repository.

9. Database
PostgreSQL
PostgreSQL is the recommended database.
BrandBid has strongly relational data:
Brand
 ↓
Payment
 ↓
Bid
 ↓
Ranking
 ↓
Activity
The ranking system also needs reliable transactional behavior.
PostgreSQL is therefore preferable to MongoDB for this product.

10. Database Platform
Supabase
Use Supabase primarily as the managed PostgreSQL provider.
Benefits:
managed Postgres 
database dashboard 
backups 
easy development 
storage 
straightforward production setup 
We don't need to use every Supabase feature.
The important part is:
Managed PostgreSQL without having to operate a database server ourselves.

11. ORM
Drizzle ORM
Use Drizzle for database access.
Reasons:
TypeScript-first 
lightweight 
SQL-friendly 
good PostgreSQL support 
straightforward migrations 
easy to understand 
The ranking logic can still use raw SQL when necessary.

12. Database Schema
brands
id
website_url
slug
name
category
logo_url
description
total_bid
status
management_token_hash
created_at
updated_at

payments
id
brand_id
provider_payment_id
amount
currency
status
created_at
verified_at

bid_history
id
brand_id
payment_id
amount_added
previous_total
new_total
previous_rank
new_rank
created_at

activity
id
brand_id
event_type
metadata
created_at

13. No User Database
Public users do not need accounts.
Therefore the MVP does not need:
users
passwords
sessions
oauth_accounts
This is an intentional architectural decision.
The core flow is:
Website
 ↓
Category
 ↓
Bid
 ↓
Payment
 ↓
Leaderboard

14. Brand Ownership
If brands need to modify their listing later, use a secure management token.
Conceptually:
brandbid.me/manage/<random-token>
The database stores only a hash of the token:
management_token_hash
The raw token is given to the purchaser through a secure channel.
The token can provide access to:
update brand information 
increase bid 
view bid history 
No password is required.

15. Payment Provider
Razorpay
For the initial India-focused launch, use Razorpay.
The important architecture is:
User
 ↓
BrandBid
 ↓
Create payment order
 ↓
Razorpay Checkout
 ↓
Payment
 ↓
Razorpay Webhook
 ↓
Verify webhook
 ↓
Database transaction
 ↓
Update bid
 ↓
Recalculate ranking

16. Payment Security
This is one of the most important technical requirements.
Never do:
Frontend
 ↓
"Payment successful"
 ↓
Update database
Instead:
Razorpay
 ↓
Webhook
 ↓
Verify signature
 ↓
Verify payment
 ↓
Database transaction
 ↓
Update brand
The frontend can display the payment result, but the server determines whether the payment actually counts.

17. Payment Idempotency
Payment webhooks can be delivered more than once.
Therefore, the system must prevent:
Webhook
Webhook
Webhook
from becoming:
₹5,000
+ ₹5,000
+ ₹5,000
The payment provider's transaction/reference ID should be unique.
Conceptually:
provider_payment_id UNIQUE
If the same webhook arrives again:
Ignore it because the payment has already been processed.

18. Ranking Engine
Ranking is based on:
Total verified amount paid by the brand.
Conceptually:
ORDER BY total_bid DESC
Tie-break:
Earlier brand/payment reaching the same amount gets the higher position.
Example:
ACME     ₹50,000
NOVA     ₹32,000
ORBIT    ₹21,500
PIXEL    ₹12,000
New payment:
NEW BRAND
₹35,000
Results:
ACME       #1
NEW BRAND  #2
NOVA       #3
ORBIT      #4
PIXEL      #5

19. Ranking Consistency
The system should avoid calculating ranking independently in different parts of the application.
There should be one canonical ranking function/service.
For example:
ranking/
  calculateRankings()
  getBrandRank()
  getNextRank()
This prevents inconsistencies between:
homepage 
brand page 
payment confirmation 
admin dashboard 

20. Concurrent Bids
This is an important edge case.
Imagine:
#1 = ₹50,000
#2 = ₹30,000
Two companies simultaneously submit:
Company A = ₹35,000
Company B = ₹40,000
The database transaction must ensure both payments are processed correctly and the final ordering is consistent.
PostgreSQL transactions/appropriate locking should be used around the operation that:
verifies the payment 
updates the brand's total 
records the bid 
determines ranking/activity 

21. Website Metadata
When the user enters:
https://example.com
the backend can attempt to retrieve:
title 
favicon 
Open Graph image 
description 
This reduces the information the user has to enter.
However, metadata retrieval should be treated as best effort.
If it fails:
The website can still be submitted.
The claim flow should never depend completely on external metadata.

22. Image Handling
If we use website logos/favicons:
Website
 ↓
Fetch metadata
 ↓
Process/validate
 ↓
Store
 ↓
CDN
 ↓
Poster
If users can upload assets later:
Supabase Storage can handle them.
Validate:
MIME type 
file size 
dimensions 
file contents 

23. Deployment
Vercel
Deploy the Next.js application on Vercel.
Architecture:
GitHub
   ↓
Vercel
   ↓
Next.js
Every pull request can have a preview deployment.
This is especially useful while iterating on the visual design.

24. Production Infrastructure
Initial infrastructure:
                 Internet
                    │
                    ↓
                  Vercel
                    │
               Next.js App
                    │
          ┌─────────┴─────────┐
          ↓                   ↓
     Supabase             Razorpay
     PostgreSQL             Payments
          │
          ↓
     Brand data
     Bid data
     Payment data
That's enough for the MVP.

25. Analytics
PostHog
Track the entire user journey.
Important events:
homepage_viewed
claim_clicked
website_entered
category_selected
bid_entered
checkout_started
payment_completed
brand_published
rank_changed
brand_clicked
website_clicked
share_clicked
The main funnel:
Visitor
 ↓
Claim CTA
 ↓
Claim form
 ↓
Checkout
 ↓
Payment
 ↓
Published brand

26. Error Monitoring
Sentry
Monitor:
frontend exceptions 
API failures 
database errors 
payment errors 
webhook failures 
metadata-fetch failures 
Payment/webhook errors should be particularly visible.

27. Validation
Zod
All externally supplied data should be validated.
Example:
website URL
category
bid amount
brand metadata
management token
Example conceptual schema:
const claimSchema = z.object({
  websiteUrl: z.string().url(),
  category: z.string(),
  bidAmount: z.number().positive(),
});

28. Testing
Vitest
Use for:
ranking calculations 
bid calculations 
validation 
poster-tier logic 
payment processing logic 
Example:
₹50,000 > ₹30,000
→ #1

Playwright
Use for the critical end-to-end journey:
Open BrandBid
 ↓
Click Claim
 ↓
Enter website
 ↓
Select category
 ↓
Enter bid
 ↓
Start checkout
 ↓
Payment
 ↓
Brand appears on board

29. Security Requirements
The application must protect:
Payment data
Never trust client-side payment status.
Ranking
Never allow users to submit:
rank = 1
Bid
Never allow:
totalBid = 999999
from client-controlled data.
Management
Management tokens must be:
cryptographically random 
sufficiently long 
hashed in storage 
revocable 
APIs
Implement:
rate limiting 
validation 
authorization 
CSRF protections where applicable 
secure headers 
input sanitization 

30. API Structure
Recommended:
/api
  /leaderboard
  /brands
    /[slug]

  /claim
  /payments
    /create
    /webhook

  /bids
    /increase

  /manage
    /[token]
Admin endpoints should be isolated from public endpoints.

31. Caching
The public leaderboard will likely be read much more frequently than it changes.
Therefore:
Many reads
     ↓
Cache/revalidation
     ↓
PostgreSQL
Next.js caching/revalidation can be used initially.
Don't introduce Redis until traffic demonstrates that we actually need it.

32. Realtime Updates
MVP
No WebSockets.
Use:
server rendering 
revalidation 
polling where necessary 
Later
If the board becomes active enough:
Payment
 ↓
Database
 ↓
Realtime event
 ↓
Connected browsers
 ↓
Poster moves
Supabase Realtime can be evaluated at that point.

33. Redis
MVP: No Redis.
We don't need another infrastructure dependency just for caching.
Add Redis later if we need:
high-volume caching 
rate limiting at scale 
queues 
leaderboard performance optimization 
background jobs 

34. Background Jobs
Initially, avoid a job queue.
For slower tasks such as:
metadata fetching 
image processing 
social image generation 
we can introduce a background-job system later if necessary.
The payment confirmation path should remain simple and reliable.

35. Project Structure
Recommended structure:
brandbid/
│
├── app/
│   ├── page.tsx
│   ├── claim/
│   ├── brand/
│   │   └── [slug]/
│   ├── manage/
│   │   └── [token]/
│   ├── admin/
│   └── api/
│
├── components/
│   ├── board/
│   ├── posters/
│   ├── claim/
│   ├── brand/
│   └── ui/
│
├── lib/
│   ├── db/
│   ├── payments/
│   ├── ranking/
│   ├── metadata/
│   └── validation/
│
├── drizzle/
│   └── migrations/
│
├── public/
│
└── tests/

36. Environment Variables
Production secrets should live in the deployment platform's secret/environment-variable system.
Examples:
DATABASE_URL

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

SENTRY_DSN

POSTHOG_KEY
Never commit these to Git.

37. Development Workflow
Recommended:
Local Development
       ↓
Git branch
       ↓
Pull Request
       ↓
Vercel Preview
       ↓
Testing
       ↓
Merge
       ↓
Production
GitHub should be the source of truth.

38. Environment Separation
Maintain:
Development
Local database/test payment environment.
Staging/Preview
Vercel preview deployment.
Production
Real database + real payments.
Never test experimental payment logic against production transactions.

39. Scalability Strategy
We should scale only when necessary.
Stage 1 — MVP
Next.js
Postgres
Razorpay
Vercel
Stage 2 — Growing traffic
Add:
CDN optimization 
caching 
database indexes 
image optimization 
background jobs 
Stage 3 — Significant traffic
Potentially add:
Redis 
dedicated API service 
queue system 
realtime infrastructure 
read replicas 
There is no reason to start at Stage 3.

40. Recommended Database Indexes
Important indexes:
brands(total_bid DESC)

brands(slug UNIQUE)

brands(category)

payments(provider_payment_id UNIQUE)

payments(brand_id)

bid_history(brand_id)

activity(created_at DESC)
The leaderboard query is especially important because it is the most frequently accessed dataset.

41. Technical Non-Goals
For MVP, explicitly avoid:
microservices 
Kubernetes 
Docker orchestration 
GraphQL 
Redis 
Kafka 
WebSockets 
custom authentication 
separate Express server 
mobile applications 
multi-region infrastructure 
The goal is:
Ship the product, not the infrastructure.

42. Final Architecture
                         ┌──────────────┐
                         │   Visitor    │
                         └──────┬───────┘
                                │
                                ↓
                         ┌──────────────┐
                         │   Vercel     │
                         │   Next.js    │
                         └──────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ↓                 ↓                 ↓
        Leaderboard         Claim Flow        Brand Pages
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ↓
                         Server Functions
                         / Route Handlers
                                │
                    ┌───────────┴───────────┐
                    ↓                       ↓
              PostgreSQL                 Razorpay
              (Supabase)                  Payments
                    │                       │
                    │                  Webhook
                    │                       │
                    └───────────┬───────────┘
                                ↓
                         Ranking Engine
                                │
                         ┌──────┴──────┐
                         ↓             ↓
                      Posters       Activity

43. Final Stack Decision
Core
Next.js + React + TypeScript
Styling
Tailwind CSS + custom CSS
Backend
Next.js Route Handlers
Database
PostgreSQL via Supabase
ORM
Drizzle
Payments
Razorpay
Authentication
None for public users
Brand management
Secure tokenized management link
Storage
Supabase Storage
Hosting
Vercel
Analytics
PostHog
Monitoring
Sentry
Validation
Zod
Testing
Vitest + Playwright

Architecture principle
The most important technical decision isn't actually which framework we use.
It's this:
Keep BrandBid a single, boring, reliable application until the product proves it needs more.
For this particular product, Next.js + PostgreSQL + Razorpay + Vercel is more than enough to build a polished, production-ready MVP without drowning ourselves in infrastructure.
