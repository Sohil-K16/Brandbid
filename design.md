BrandBid.me — Design Document
Version: 1.0Status: Design DirectionProduct: BrandBid.meDesign Reference: Outbid.lol, Firstbid.lol, BrandMyBald.lol

1. Design Vision
BrandBid.me should feel like an internet-native visual experiment rather than a conventional SaaS product.
The design combines:
the competitive feel of Outbid 
the extreme simplicity of Firstbid 
the playful personality of BrandMyBald 
a strong editorial/poster aesthetic unique to BrandBid 
Core design statement
A digital wall of brands competing for attention.
The interface should make the leaderboard itself feel like the product.

2. Design Personality
BrandBid should feel:
Minimal 
Bold 
Playful 
Competitive 
Premium 
Experimental 
Internet-native 
Slightly absurd 
It should not feel:
Corporate 
Like a traditional advertising platform 
Like a generic SaaS dashboard 
Overly polished/corporate 
Like a template-based website 
The goal is to create the feeling:
"This is weirdly simple, but I want my brand on it."

3. Design Principles
3.1 Simplicity First
The user should understand the concept almost immediately.
Avoid long explanations.
Prefer:
How high can your brand climb?
over:
"BrandBid is a revolutionary platform that allows..."

3.2 The Board Is the Hero
The leaderboard should dominate the website.
Navigation, marketing copy, and secondary information should never compete with it.

3.3 Ranking Should Be Visible
The position should be immediately recognizable.
#01
#02
#03
Rank is one of the strongest visual elements.

3.4 Higher Rank = Better Visual Treatment
Ranking should directly affect the design of the poster.
Higher rank
     ↓
Larger poster
     ↓
More visual detail
     ↓
More prestigious treatment

3.5 Design for Screenshots
A brand at #1 should look good when someone screenshots it.
A founder should be able to post:
"We're #3 on BrandBid."
and the screenshot should already function as the marketing asset.

4. Visual Language
The visual language should be based on:
Large typography
Used for:
hero 
brand names 
rankings 
major statistics 
Small metadata
Used for:
categories 
timestamps 
supporting information 
labels 
Thin borders
Used to define sections without heavy cards or shadows.
Large whitespace
Whitespace should make the posters feel more like physical/editorial layouts.
Controlled color
Color should communicate hierarchy rather than decorate every component.

5. Color System
Base Colors
Background
#F7F6F2
Warm off-white.
Primary
#111111
Near-black.
Secondary
#6B6B67
Muted gray.
Borders
#D8D6D0
Subtle neutral border.

Ranking Colors
#1 — Gold
#E7B93C
#2 — Silver
#BFC3C7
#3 — Bronze
#B8794B
Accent
#FF5C35
Used sparingly for interactive/highlighted elements.

6. Color Philosophy
The majority of the interface should remain:
off-white + black + gray.
Ranking introduces color.
For example:
#50
Neutral

#20
Slightly more visual

#10
More prominent

#3
Bronze

#2
Silver

#1
Gold
This makes color itself feel like a reward for ranking higher.

7. Typography
Typography should be one of the strongest visual elements.
Primary Font
Recommended:
Geist
Alternative:
Inter
Display Font
Recommended:
Geist / Inter Tight / Space Grotesk
Monospace
Geist Mono
Use monospace selectively for:
bid values 
rankings 
numbers 
timestamps 

8. Typography Hierarchy
Hero
72–120px desktop
Large, bold, compact.
Example:
HOW HIGH CAN
YOUR BRAND
CLIMB?
Section headings
32–48px
Brand names
24–64px, depending on poster tier.
Bid amount
28–48px
Metadata
12–16px
The contrast between huge headlines and tiny metadata is intentional.

9. Layout Philosophy
Use an editorial grid.
Large elements should have room to breathe.
Avoid:
Card
Card
Card
Card
everywhere.
Instead think:
────────────────────────────

              #01

           BRAND NAME

        LARGE POSTER

────────────────────────────
The board should feel closer to an exhibition wall than a dashboard.

10. Navigation
Navigation should be minimal.
Option A
BRANDBID                         CLAIM YOUR SPOT →

BOARD      HOW IT WORKS      ABOUT
Option B — Extreme minimalism
BRANDBID.ME                    CLAIM YOUR SPOT →
Prefer Option B if the rest of the page makes navigation unnecessary.

11. Hero Design
The hero should be visually sparse.
Recommended structure:
                         BRANDBID

                HOW HIGH CAN
                YOUR BRAND CLIMB?

       The more you bid, the higher you rank.

              127 BRANDS
              ₹482,391 BID

                  ↓

             CLAIM YOUR SPOT →
The hero should transition quickly into the board.

12. Board Design
The board is the visual centerpiece.
It should feel like a scrollable digital gallery.
Instead of traditional leaderboard rows:
#1 Company ₹50,000
#2 Company ₹30,000
#3 Company ₹20,000
use:
          #01

    ┌───────────────┐
    │               │
    │     ACME      │
    │               │
    │   ₹50,000     │
    │               │
    └───────────────┘
Then progressively smaller treatments as the ranking decreases.

13. Poster System
Every brand receives a poster.
The poster should contain:
Rank 
Brand name 
Logo 
Bid amount 
Category 
Website 
Optional:
tagline 
description 
website metadata 

14. Poster Hierarchy
Tier 1 — #1
"LEGENDARY"
Characteristics:
largest 
strongest typography 
gold treatment 
premium border 
dramatic whitespace 
subtle animation 
special #1 indicator 
Possible label:
CURRENTLY ON TOP

Tier 2 — #2
"CHALLENGER"
Characteristics:
large 
silver treatment 
premium layout 

Tier 3 — #3
"CONTENDER"
Characteristics:
large 
bronze treatment 
strong typography 

Tier 4 — #4–10
"ELITE"
Characteristics:
medium/large 
more elaborate layouts 
strong visual identity 

Tier 5 — #11–25
"FEATURED"
Characteristics:
standard poster 
clear hierarchy 
moderate visual complexity 

Tier 6 — #26–50
"STANDARD"
Characteristics:
compact 
minimal decoration 

Tier 7 — #51+
"BOARD"
Characteristics:
smallest treatment 
primarily informational 

15. Poster Templates
Posters shouldn't all look identical.
Create several controlled layouts.
Template A — Typography
#07

ACME

BUILDING
WHAT'S
NEXT.

₹5,000
Template B — Logo dominant
#12

      [LOGO]

      ACME

      ₹3,500
Template C — Editorial
ACME

A NEW WAY
TO BUILD.

#09
₹4,500
Template D — Minimal
#31

ACME
₹1,200
The system can rotate templates while maintaining the ranking hierarchy.

16. Poster Composition
Posters should prioritize:
Rank 
Brand name/logo 
Bid 
Category 
Website 
The user should be able to identify the brand within a second.

17. Rank Badge
Rank should have a consistent visual language.
Examples:
#01
rather than always relying on:
🥇
Emoji can be used selectively, especially around #1, but the primary system should remain typographic.

18. Bid Display
Money is a major visual component.
Example:
₹50,000
should be much more prominent than:
Category: AI
Use a monospaced font for consistency.
The amount should never be visually hidden.

19. Interaction Design
Interactions should be lightweight.
Poster hover
On desktop:
slight scale 
border/highlight 
reveal additional information 
Poster click
Open a detail panel or navigate to the brand page.
Rank movement
Animate the poster moving from its previous position to its new position.

20. Ranking Animation
If a brand moves:
#17
 ↓
#11
the movement should be visually obvious.
Use:
position transition 
subtle highlight 
rank number transition 
Avoid excessive animation.

21. New #1 Animation
When a new brand takes #1:
NEW #1
Briefly highlight the poster.
Gold treatment can appear temporarily.
The animation should feel like a scoreboard update, not a casino.

22. Activity Feed
The activity feed should resemble a compact live ticker.
LIVE ACTIVITY

● ACME moved to #4
  12 sec ago

● NOVA entered at #12
  35 sec ago

● ORBIT climbed 5 places
  2 min ago
Use tiny typography.
It should complement the board rather than dominate it.

23. CTA Design
Primary CTA:
[ CLAIM YOUR SPOT → ]
or:
[ BID → ]
Buttons should be:
compact 
high contrast 
rectangular/slightly rounded 
typography-focused 
Avoid huge pill buttons.
Recommended radius:
4–8px

24. Input Design
Inputs should feel like part of the editorial interface.
Example:
YOUR WEBSITE

┌─────────────────────────────────┐
│ https://yourwebsite.com         │
└─────────────────────────────────┘
Use thin borders.
Avoid:
giant shadows 
excessive rounded corners 
floating labels everywhere 

25. Claim Flow Design
The claim experience should be a focused sequence.
CLAIM YOUR SPOT

YOUR WEBSITE

[ https://___________ ]

CATEGORY

[ SaaS ▼ ]

YOUR BID

₹ [ 5,000 ]

────────────────────

[ CLAIM YOUR SPOT → ]
Minimal explanatory text.

26. Confirmation Design
After payment:
BID CONFIRMED.

YOU'RE #17.

₹5,000

        [ VIEW YOUR POSTER → ]

        [ SHARE → ]
Keep it celebratory but restrained.

27. Microcopy Style
Copy should be short and playful.
Instead of:
"Your payment has been successfully processed."
Use:
bid confirmed.
Instead of:
"Your brand has been placed at position #17."
Use:
you're #17.
Instead of:
"Increase your bid to improve your position."
Use:
want to climb?
Instead of:
"You are currently ranked first."
Use:
you're on top. 👑

28. Brand Page
The public brand page should be almost poster-like.
                         #07

                         ACME

                  BUILDING THE FUTURE

                       ₹5,000

                         AI

                 [ VISIT WEBSITE ↗ ]

                      [ SHARE ]
Large whitespace.
Very little UI chrome.

29. Shareability
The design should intentionally support screenshots.
A brand's poster should work as:
website content 
social preview 
screenshot 
X post 
LinkedIn post 
The product should create marketing assets automatically through participation.

30. Responsive Design
Desktop
Large posters and generous whitespace.
Possible layout:
┌──────────────────────────────────────────┐
│                                          │
│                 #01                      │
│                                          │
│                BRAND                     │
│                                          │
└──────────────────────────────────────────┘

Tablet
Reduce poster dimensions while maintaining hierarchy.

Mobile
One primary poster per row.
#01

┌──────────────────────┐
│                      │
│        ACME          │
│                      │
│       ₹50,000        │
│                      │
└──────────────────────┘

#02

┌──────────────────────┐
│        NOVA          │
│       ₹32,000        │
└──────────────────────┘
The experience should remain visually strong rather than simply shrinking the desktop version.

31. Spacing
Use generous spacing around major elements.
Suggested base spacing scale:
4
8
12
16
24
32
48
64
96
128
Large sections should often use:
64–128px
vertical spacing.

32. Border System
Primary border:
1px solid #D8D6D0
Strong border:
1px solid #111111
Use borders instead of shadows wherever possible.

33. Shadows
Use very little shadow.
Preferred:
No shadow
or extremely subtle shadow only when necessary for overlays.
The visual language should feel flat and printed.

34. Corner Radius
Keep the interface relatively sharp.
Recommended:
Posters: 0–4px 
Inputs: 4–6px 
Buttons: 4–8px 
Modals: 8–12px 
Avoid the ubiquitous 9999px pill aesthetic.

35. Iconography
Keep icons minimal.
Preferred visual language:
→
↗
↑
↓
+
×
#
Use icons only where they improve comprehension.

36. Dark Mode
MVP recommendation:
Light mode only.
The warm off-white background and black typography are central to the visual identity.
Dark mode can be explored later if there's a compelling reason.

37. Motion Philosophy
Motion should communicate:
ranking 
competition 
confirmation 
interaction 
Motion should not exist merely because we can animate something.
Good
Brand moves:
#18 → #11
Bad
Every card constantly floating around.
The site should feel alive, not exhausting.

38. Design System Components
Global
Header 
Footer 
Button 
Input 
Select 
Modal 
Toast 
Board
Leaderboard 
Poster 
Rank 
Bid 
Category 
Activity Feed 
Rank Movement 
Brand
Brand Poster 
Brand Detail 
Website Link 
Share Button 
Claim
Website Input 
Category Selector 
Bid Input 
Claim CTA 
Payment Confirmation 

39. Design States
Every important component should have defined states.
Poster
default 
hover 
active 
rank changed 
loading 
Claim form
empty 
typing 
invalid URL 
valid URL 
loading 
payment 
success 
error 
Board
loading 
populated 
empty 
error 

40. Accessibility
Despite the experimental aesthetic, the site should remain accessible.
Requirements:
sufficient text contrast 
keyboard navigation 
visible focus states 
semantic HTML 
alt text for logos 
accessible form labels 
reduced-motion support 
buttons must have clear accessible names 

41. Design Anti-Patterns
Avoid these completely:
❌ Generic SaaS cards
┌──────────────────┐
│ Icon             │
│ Title            │
│ Description      │
│ Learn More →     │
└──────────────────┘
❌ Excessive gradients
❌ Glassmorphism
❌ Huge pill buttons
❌ Excessive shadows
❌ Overly rounded cards
❌ Corporate stock imagery
❌ Long paragraphs
❌ Complex navigation
❌ Dashboard-first experience

42. Reference Translation
The references should influence principles, not be copied literally.
Reference
Borrow
Don't Copy
Outbid
Competition, ranking, money visibility
Exact card structure
Firstbid
Minimalism, CTA simplicity
Exact typography/layout
BrandMyBald
Playfulness, animation, screenshotability
Exact visual gimmicks
BrandBid's own identity should emerge from the combination.

43. BrandBid's Unique Visual Idea
The most important design concept is:
The leaderboard is also a visual hierarchy.
Traditional leaderboard:
#1
#2
#3
#4
#5
BrandBid:
          #1
       BIGGEST
       BEST
       MOST
       PRESTIGIOUS

          ↓

         #2
       LARGE

          ↓

         #3
       LARGE

          ↓

        #10
       MEDIUM

          ↓

        #50
       SMALL
The ranking is therefore communicated through both numbers and visual scale.

44. Design North Star
Every design decision should answer:
Does this make the board more exciting to look at, easier to understand, or more desirable to participate in?
If not, it probably doesn't belong in the MVP.

45. Final Design Direction
BrandBid.me should ultimately look like:
A minimalist digital exhibition where brands compete for visual status.
The interface stays mostly warm white, black, gray, and thin borders.
Typography is bold.
Metadata is tiny.
Posters become progressively more impressive as brands climb.
Gold, silver, and bronze communicate the top three positions.
Animation communicates movement.
Microcopy adds personality.
And the entire experience is designed so that a founder can look at their brand at #3 and immediately think:
"Damn, that looks good."
That is the design goal.
