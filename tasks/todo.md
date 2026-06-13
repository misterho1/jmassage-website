# Fix GSC "Multiple reviews without aggregateRating" on /reviews

## Problem
Google Search Console: "Multiple reviews without aggregateRating object" —
5 affected items on https://jmassageslc.com/reviews. Review items invalid /
ineligible for rich results.

## Investigation findings
- Static HTML site (Cloudflare Pages). No build step.
- `reviews.html` has ONE JSON-LD block (line 26): a single business entity
  `@id=https://jmassageslc.com/#business`, type
  `["LocalBusiness","HealthAndBeautyBusiness","MassageTherapist"]`, with a
  `review` array of **5** Review objects — but **no `aggregateRating`**.
- The page actually **displays 12 review cards** in HTML, all rated 5 stars.
- No `aggregateRating` exists anywhere in the repo.
- `#business` @id is reused (redeclared) on many pages; only `reviews.html`
  carries any Review schema, so the error is isolated to /reviews.
- Root cause: reviews nested under one entity but missing the required
  sibling `aggregateRating`. (The reviews were already nested — the task's
  "standalone reviews" hypothesis did not match the actual markup.)

## Plan
- [x] Map all schema on /reviews and across pages
- [x] Keep existing business `@type` and `@id`
- [x] Add `aggregateRating` (AggregateRating) sibling to the entity
- [x] Mark up ALL 12 displayed reviews in the `review` array (each with
      author.name + reviewRating.ratingValue; add datePublished + reviewBody)
- [x] Compute values from visible content: all 12 cards are 5 stars
      → ratingValue = "5.0", reviewCount = "12", bestRating = "5"
      (NOT the marketing "450+" — that would inflate beyond marked-up content)
- [x] Confirm no other page breaks (no other page has Review/aggregateRating)
- [x] Validate rendered JSON-LD parses, one entity, aggregateRating present,
      all reviews nested with required fields
- [x] Commit + push to claude/jmassageslc-reviews-schema-brxm9s
- [ ] After deploy, fetch live /reviews and confirm new markup in production

## Final values used
- ratingValue: 5.0
- reviewCount: 12
- bestRating: 5
