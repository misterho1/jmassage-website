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
      BLOCKED / NOT YET DONE:
      1. Change is on the feature branch, not the deploy branch (main).
         Cloudflare Pages serves production from main, so the change must be
         merged before it reaches https://jmassageslc.com/reviews. (No PR
         created — was not requested.)
      2. Outbound fetches to the live domain return HTTP 403 from this
         sandbox (Cloudflare bot protection blocks curl and WebFetch), so
         live verification can't be performed from here regardless.
      To verify after merge+deploy: load https://jmassageslc.com/reviews,
      view source, confirm the JSON-LD has the aggregateRating block and 12
      nested Review objects; or run the URL through Google Rich Results Test
      / re-validate in Search Console.

## Final values used (corrected per owner)
- ratingValue: 4.4  (real Google rating for J Massage SLC)
- reviewCount: 477  (real Google review total)
- bestRating: 5
- Visible stats on /reviews (hero, H1, CTA, footer, title/meta) updated to
  match 477 / 4.4 so markup == visible content (Google spam policy).
- The 12 nested Review objects remain a DISPLAYED SAMPLE; aggregateRating
  carries the true totals.

## Open follow-ups (owner asked about)
- The 12 sample reviews are placeholder/testimonial copy, all 5 stars, not
  real Google reviews. With a real 4.4 aggregate, showing only fabricated
  5-star samples is inaccurate and a Google spam-policy risk. Recommend
  replacing with live/real reviews (see handoff in chat).
- "450+ / 5.0" still appears on OTHER pages (index, services, about,
  contact, pricing, massage-salt-lake-city, footer of every page). Only
  reviews.html was corrected. Decide whether to roll 477/4.4 site-wide.
- Self-serving review caveat: review markup about your own LocalBusiness on
  your own site generally does NOT earn star rich results in Google Search
  (2019 policy). Fixing the GSC validity error is still correct, but stars
  in search come from the Google Business Profile, not this markup.
