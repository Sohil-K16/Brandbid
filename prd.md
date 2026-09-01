BrandBid.me — Product Requirements Document
Version: 2.0Status: MVP DefinitionProduct: BrandBid.meDomain: brandbid.meTarget users: Brands, startups, founders, indie businessesPlatform: WebPrimary market: Global, with INR payment support for initial launch

1. Product Overview
BrandBid.me is a public leaderboard where brands and startups compete for higher positions by paying to place their website on the board.
A user simply:
Enters their website 
Selects a category 
Chooses how much they want to pay/bid 
Completes payment 
Their website appears on the leaderboard according to the amount paid 
Core rule
The higher the amount paid, the higher the position.
The highest-paying website is #1, the second-highest is #2, and so on.
Each website receives a visually designed poster whose size, styling, and prestige correspond to its position.

2. Product Vision
Create the most entertaining public leaderboard for brands on the internet.
BrandBid should feel less like traditional advertising and more like an internet-native competition.
A company isn't simply buying an ad.
It is effectively saying:
"We paid ₹X to be #Y on BrandBid."
The resulting ranking and poster become something the company can share.

3. Problem
Startups and brands are constantly looking for:
attention 
visibility 
inexpensive marketing 
social media content 
unconventional ways to promote themselves 
ways to differentiate themselves from competitors 
Traditional advertising platforms can be complicated and performance-oriented.
BrandBid offers something different:
A simple, public, competitive form of brand visibility.
The product turns a marketing purchase into a public status signal.

4. Product Hypothesis
We believe:
Brands and startups will pay to appear on a public leaderboard if the experience is entertaining, visually appealing, competitive, and shareable.
The product should validate this with minimal friction.

5. Target Users
Primary — Startups
Examples:
SaaS startups 
AI startups 
developer tools 
consumer startups 
fintech startups 
indie products 
Why they participate
marketing 
visibility 
founder bragging rights 
social media content 
curiosity 
startup culture 

Primary — Brands
Small and medium-sized businesses that want unconventional exposure.

Primary — Founders
Founders may submit their startup directly.
They don't need to create a traditional user account.

Secondary — Visitors
Visitors browse the board to:
discover brands 
see who's #1 
compare bids 
explore categories 
watch ranking changes 
click through to websites 
share interesting brands 
Visitors are important because they create the attention that gives the leaderboard value.

6. Core Product Loop
Visitor discovers BrandBid
          ↓
Sees interesting brands
          ↓
Wants their brand on the board
          ↓
Enters website
          ↓
Selects category
          ↓
Chooses bid amount
          ↓
Pays
          ↓
Website appears on leaderboard
          ↓
Gets ranking + poster
          ↓
Shares it
          ↓
New brands discover BrandBid
          ↓
Competition increases

7. Core Ranking Mechanism
This is the central product rule.
Ranking is based entirely on paid bid amount.
Example:
Position
Website
Category
Paid
🥇 #1
acme.ai
AI
₹50,000
🥈 #2
nova.dev
Developer Tools
₹32,000
🥉 #3
orbit.io
SaaS
₹21,500
#4
pixel.app
Consumer
₹12,000
#5
zenith.co
E-commerce
₹7,500
If a new company pays ₹35,000:
Position
Website
Paid
🥇 #1
acme.ai
₹50,000
🥈 #2
newbrand.com
₹35,000
🥉 #3
nova.dev
₹32,000
#4
orbit.io
₹21,500
#5
pixel.app
₹12,000
All lower-ranked websites automatically move down.

8. Bid Rules
For the MVP:
Initial bid
A website makes a payment to establish its leaderboard position.
Higher payment
A higher payment results in a higher ranking.
Existing brands
Existing brands can make another bid to increase their total paid amount if we choose to support rebidding in V1.
The initial implementation should define one clear rule and communicate it prominently.
Recommended V1 rule
Total verified amount paid by a website determines its ranking.
Therefore:
Brand A
₹5,000

Brand A adds ₹5,000

Total = ₹10,000
The ranking is based on ₹10,000.
This creates an ongoing competitive loop without requiring accounts.

9. User Experience
The entire initial experience should take approximately 30 seconds or less.
Step 1 — Homepage
User sees:
BRANDBID
How high can your brand climb?
The higher you bid, the higher you rank.
CTA:
CLAIM YOUR SPOT →

Step 2 — Submission
YOUR WEBSITE

[ https://yourwebsite.com ]

CATEGORY

[ AI ▼ ]

YOUR BID

₹ [ 5,000 ]

Estimated position:
#17

[ CLAIM YOUR SPOT → ]
No:
account creation 
password 
profile setup 
onboarding 

Step 3 — Payment
User is taken to the payment provider.

Step 4 — Confirmation
After successful payment:
🎉 YOU'RE ON THE BOARD

YOUR BRAND

ACME

POSITION

#17

BID

₹5,000

[ VIEW YOUR POSTER → ]

[ SHARE → ]

10. Website Metadata
The user should only need to provide a website URL.
BrandBid should attempt to automatically retrieve:
website title 
favicon 
Open Graph image 
description 
site name 
This reduces friction.
Example:
User enters:
https://acme.ai
BrandBid automatically creates:
ACME

Building the future of AI.

acme.ai

#17
₹5,000
The user can potentially confirm/edit the retrieved information before payment.

11. Category System
Every listing must have a category.
Initial categories
AI 
SaaS 
Developer Tools 
Fintech 
E-commerce 
Consumer 
Agency 
Education 
Other 
The category is primarily for discovery and organization.
MVP
There is one global leaderboard.
Categories do not create separate rankings initially.
Future
Category-specific leaderboards can be added:
AI Brands
SaaS Brands
Developer Tools
etc.

12. Leaderboard
The leaderboard is the core visual experience.
It should be a vertical scrolling brand wall, not a conventional table.
Example:
             BRANDBID

      HOW HIGH CAN YOUR BRAND CLIMB?

         ₹482,391 TOTAL BID
            127 BRANDS

                 ↓

              🥇 #1

       ┌─────────────────────┐
       │                     │
       │        ACME         │
       │                     │
       │   BUILDING FUTURE   │
       │                     │
       │       ₹50,000       │
       │                     │
       └─────────────────────┘

                 ↓

              🥈 #2

       ┌─────────────────────┐
       │        NOVA         │
       │       ₹32,000       │
       └─────────────────────┘

                 ↓

              🥉 #3

                 ↓

               #4

                 ↓

               #5

13. Poster System
Every website receives a poster.
The poster is generated from the website information and ranking.
Required poster information
Logo/favicon 
Brand name 
Website 
Category 
Rank 
Paid amount 

14. Poster Ranking Tiers
The higher the position, the more impressive the poster.
#1 — Legendary
Largest poster 
Gold treatment 
Most elaborate design 
Special #1 badge 
Premium typography 
Optional subtle animation 
#2–3 — Elite
Large poster 
Silver/bronze treatments 
Distinctive design 
#4–10 — Premium
Medium-large 
More elaborate than lower positions 
#11–25 — Featured
Standard poster 
Strong visual hierarchy 
#26–50 — Standard
Smaller poster 
#51+ — Compact
Minimal treatment 

15. Poster Design Principle
The poster is the reward for ranking higher.
Therefore:
Higher bid → higher ranking → better visual treatment.
The difference between #3 and #30 should be immediately obvious.

16. Brand Detail Page
Every website gets a public page.
Example:
brandbid.me/brand/acme
It should display:
ACME

🥇 #1

₹50,000

AI

Building the future.

[ VISIT WEBSITE ↗ ]

[ SHARE ]

──────────────────

BRANDBID

#1 CURRENTLY
No login required to view it.

17. Sharing
Every listing should be highly shareable.
Share options
X 
LinkedIn 
Copy link 
Example:
We're currently #7 on BrandBid 🚀
See our spot → brandbid.me/brand/acme

18. Social Preview
When a brand page is shared, the preview should display:
┌───────────────────────────────┐
│                               │
│          🥇 #7                │
│                               │
│            ACME               │
│                               │
│           ₹5,000              │
│                               │
│         BRANDBID.ME           │
│                               │
└───────────────────────────────┘
This is important for organic growth.

19. Activity Feed
A small live activity section should show changes.
Examples:
🚀 acme.ai entered at #12
🔥 nova.dev moved to #4
💰 pixel.app increased its bid
👑 acme.ai is now #1
This makes the board feel alive.

20. Ranking Movement
When a new payment changes rankings, the UI should visually communicate it.
Example:
NOVA

#8
 ↓
#5

↑ 3 POSITIONS
The affected posters can animate into their new positions.

21. "Next Rank" Feature
For existing brands, show the amount needed to climb.
Example:
YOU ARE #17

CURRENT BID
₹4,200

────────────────

#16
₹4,500

ONLY ₹300 TO GO

[ INCREASE BID → ]
This creates the competitive loop.

22. Authentication
MVP: No user accounts
Users should not need:
username 
password 
account creation 
login 
OAuth 
The product should be frictionless.
Brand ownership
After payment, the system can provide a private management link/token if we allow editing/rebidding.
Example:
brandbid.me/manage/<secure-token>
The token should be:
cryptographically random 
stored securely 
revocable 
never exposed publicly 
This gives the buyer management capabilities without introducing accounts.

23. Payment
Payment is the critical backend operation.
Initial payment provider
Razorpay for India-first launch.
International payment support can be added later.
Payment flow
Website submission
       ↓
Bid amount
       ↓
Create payment order
       ↓
Payment provider
       ↓
Payment
       ↓
Webhook
       ↓
Verify payment
       ↓
Database transaction
       ↓
Update paid amount
       ↓
Calculate ranking
       ↓
Create activity
       ↓
Publish listing
Important
The frontend must never directly decide that payment succeeded.
Only a verified server-side payment event can update the leaderboard.

24. Database
The MVP can remain very small.
brands
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
brand_id
provider_payment_id
amount
currency
status
created_at
verified_at
bid_history
brand_id
payment_id
amount_added
previous_total
new_total
previous_rank
new_rank
created_at
activity
brand_id
event_type
metadata
created_at
No user table is necessary for the public MVP.

25. Technology Stack
Frontend
Next.js + TypeScript
Styling
Tailwind CSS + custom CSS
Backend
Next.js Route Handlers / Server Functions
Database
PostgreSQL
Database provider
Supabase
ORM
Drizzle
Payments
Razorpay
Storage
Supabase Storage, if we need to store processed logos/assets.
Deployment
Vercel
Analytics
PostHog
Error monitoring
Sentry

26. Architecture
                         BRANDBID.ME
                              │
                         Next.js App
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ↓                ↓                ↓
         Homepage        Brand Pages       Claim Flow
             │                │                │
             └────────────────┼────────────────┘
                              ↓
                       Route Handlers
                              │
                    ┌─────────┴─────────┐
                    ↓                   ↓
               PostgreSQL           Razorpay
                    │                   │
                    │              Webhook
                    │                   │
                    └─────────┬─────────┘
                              ↓
                       Ranking Engine
                              ↓
                         Brand Board

                     Supabase Storage
                            ↓
                       Brand Assets

                         Vercel
                            ↓
                         Hosting

27. Admin System
Although public users don't need accounts, BrandBid needs an admin interface.
Admin functionality:
Brand moderation
view submissions 
approve 
reject 
suspend 
remove 
Payment
view payment status 
transaction ID 
amount 
refunds 
Platform
total bid volume 
number of brands 
number of payments 
daily activity 
top brands 

28. Functional Requirements
Submission
User can enter a valid website URL. 
User must select a category. 
User must enter/select a bid amount. 
Website metadata should be retrieved automatically where possible. 
User sees the expected/estimated ranking before payment where technically feasible. 
Ranking
Only verified payments count. 
Higher total paid amount = higher rank. 
Ranking automatically updates after successful payment. 
Ranking ties must have a deterministic rule. 
Ranking changes must be recorded. 
Recommended tie-breaker
If two brands have exactly the same total:
Earlier verified payment gets the higher position.
This makes the rule deterministic and avoids arbitrary ranking changes.

29. Payment Requirements
Payment must be verified server-side. 
Webhook signatures must be verified. 
Duplicate webhook events must be idempotent. 
Failed payments must not affect ranking. 
Payment records must be immutable/auditable. 
Refund behavior must be explicitly defined. 
Currency must be stored with every payment. 

30. Security Requirements
Because money determines ranking, security is critical.
Must implement
server-side payment verification 
webhook signature validation 
rate limiting 
input validation 
URL validation 
XSS protection 
secure management tokens 
authorization for management links 
file validation 
database transactions 
Users must never be able to manipulate:
total_bid
rank
payment_status
from the browser.

31. SEO
Public brand pages should be indexable.
Example:
brandbid.me/brand/acme
Metadata should include:
brand name 
category 
ranking 
BrandBid description 
This creates the possibility of organic search traffic.

32. Analytics
Important events:
homepage_viewed
board_scrolled
brand_viewed
claim_clicked
website_entered
category_selected
bid_entered
checkout_started
payment_completed
brand_published
bid_increased
rank_changed
share_clicked
website_clicked
Funnel
Visitors
   ↓
Claim CTA
   ↓
Submission
   ↓
Checkout
   ↓
Payment
   ↓
Published brand
The biggest goal is identifying where users drop off.

33. Success Metrics
North Star Metric
Verified Total Bid Volume
Total amount paid by participating brands.
This directly measures the economic activity generated by the product.

Primary Metrics
1. Paying brands
Number of unique brands that successfully pay.
Initial milestone:
10 paying brands

2. Total bid volume
Initial validation milestone:
₹1,00,000

3. Visitor → Claim conversion
Percentage of visitors clicking the claim CTA.

4. Claim → Payment conversion
Percentage of users starting the process who actually pay.
This is probably the most important conversion metric early on.

5. Repeat bidding
Percentage of brands that increase their total bid.
This tells us whether the competitive mechanic actually works.

6. Average bid
Total verified bid volume
─────────────────────────
Number of paying brands

7. Share rate
Percentage of brands sharing their BrandBid position.

8. Website click-through rate
How many BrandBid visitors click through to participating websites.
This helps establish value for participating brands.

9. Returning visitors
Percentage of visitors who return to see ranking changes.
This measures whether the leaderboard itself is entertaining.

34. MVP Success Criteria
We should consider the initial MVP validated when we achieve:
10+ paying brands 
₹1 lakh+ verified bid volume 
At least some brands make additional bids 
Brands voluntarily share their rankings 
Organic traffic begins bringing new brands 
Visitors regularly scroll/view the leaderboard 
Users understand the product without explanation 
The most important qualitative signal:
Someone sees another company at #1 and thinks, "I want my brand there."

35. MVP Feature Priorities
P0 — Required
Homepage 
Scrolling leaderboard 
Website submission 
Category selection 
Bid amount 
Payment 
Payment verification 
Automatic ranking 
Poster generation 
Brand detail page 
Responsive design 
Basic moderation 
P1 — Important
Bid increases 
Next-rank amount 
Activity feed 
Ranking animations 
X sharing 
LinkedIn sharing 
Social preview images 
Website metadata extraction 
P2 — Later
Category leaderboards 
Live updates 
Ranking history charts 
Achievements 
Weekly competitions 
Custom poster designs 
Brand analytics 
International currencies 
International payment providers 

36. MVP Launch Strategy
Phase 1 — Visual prototype
Use fake data.
Build:
hero 
leaderboard 
posters 
scrolling experience 
brand details 
ranking animations 
No payment.
Goal
Make someone look at it and immediately say:
"I want my company on that board."

Phase 2 — Functional MVP
Add:
website submission 
categories 
metadata extraction 
database 
payment 
ranking engine 

Phase 3 — First users
Invite:
indie hackers 
startup founders 
developers 
small businesses 
Target:
10 paying brands.

Phase 4 — Public launch
Use:
X 
LinkedIn 
Reddit 
Product Hunt 
Indie Hackers 
The product should generate its own marketing content.
Example:
🚨 Someone just paid ₹15,000 to enter BrandBid at #6.
or:
👑 We have a new #1.
These events are inherently shareable.

37. Product Personality
BrandBid should feel:
MinimalPlayfulCompetitivePremiumInternet-nativeSlightly ridiculous
It should not feel like:
Google Ads 
LinkedIn 
Salesforce 
a conventional SaaS dashboard 
The experience should resemble an internet experiment that accidentally became a real product.

38. Design Principles
1. Frictionless
The user should be able to go from:
website → payment → leaderboard
without an account.
2. Ranking is the reward
Higher ranking must look better.
3. Money is transparent
Users should always understand:
"I paid X and therefore I'm #Y."
4. The board is the product
Don't bury it behind a dashboard.
5. Shareability is a feature
A brand's position should look good when shared.
6. Keep the weirdness
Don't over-corporatize the product.

39. Future Product Opportunities
Once the basic model proves demand:
Category competitions
Top AI Brands
Time-limited competitions
September BrandBid
Industry competitions
Fintech Brand Wars
Achievements
🏆 First to #1🚀 Biggest climb💰 Highest bid
Brand analytics
Participating brands could see:
views 
website clicks 
ranking history 
impressions 
Premium poster customization
Companies could pay for:
custom designs 
animations 
special placements 

40. Final Product Definition
BrandBid.me
A public leaderboard where brands pay to claim their place.
The entire product can be understood through one rule:
The more you pay, the higher you rank.
And the complete user journey is:
Paste your website → choose your category → choose your bid → pay → get your position → get your poster → share it.
No account.
No complicated onboarding.
No traditional advertising dashboard.
Just a public, competitive, visually addictive board of brands.
The product's real hook:
You're not just buying visibility. You're buying a position people can see.
