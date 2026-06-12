# Task: Fix GSC "Multiple reviews without aggregateRating" on /reviews

## Problem
Google Search Console reports 5 affected items on https://jmassageslc.com/reviews:
"Multiple reviews without aggregateRating object" — items invalid / ineligible
for rich results. The page's JSON-LD nests 5 Review items under the business
entity but has NO aggregateRating sibling.

## Investigation (done)
- [x] Mapped all schema markup across the site.
- [x] `#business` entity (@id https://jmassageslc.com/#business) declared on
      index, contact, pricing, about, massage-salt-lake-city, reviews, services/*.
- [x] None of those carry aggregateRating.
- [x] Only reviews.html emits Review items — already nested under the business
      entity in a `review` array, but missing aggregateRating. Root cause confirmed.
- [x] reviews.html marks up 5 reviews, but the page visibly displays 12 cards
      (all 5-star). Need to align markup with visible content.
- [x] services/foot-massage-head-spa.html references a DIFFERENT business
      (elitespautah.com/#business) — unrelated, do not touch.

## Plan
- [x] Restructure reviews.html JSON-LD: keep ONE business entity (existing
      @type + @id), add `aggregateRating` (AggregateRating) sibling to `review`.
- [x] Expand `review` array to all 12 displayed reviews so reviewCount matches
      visible content. Each review: author.name + reviewRating.ratingValue (req).
- [x] ratingValue = 5.0 (all 12 visible cards are 5-star), reviewCount = 12,
      bestRating = 5. Numbers match visible content (no inflation; NOT 450).
- [x] Leave all other pages' #business declarations untouched (they reference
      the same @id; no standalone Review items elsewhere).

## Verification
- [x] Parse rendered JSON-LD from reviews.html: valid JSON, one business entity,
      aggregateRating present, all 12 reviews nested, required fields on each.
- [x] Cross-checked: all 12 marked-up reviews map to the 12 visible <article>
      cards (author + body present), all 5-star. Markup matches visible content.
- [x] Commit + push to claude/jmassageslc-reviews-schema-cz6iu4.
- [ ] BLOCKED: After deploy, fetch live https://jmassageslc.com/reviews and
      confirm new markup is in production.
      - Cannot verify from this environment: network egress policy returns
        403 host_not_allowed for jmassageslc.com.
      - Also pending: fix is on the feature branch; production deploys from the
        main branch, so it won't be live until the branch is merged + deployed.
      - Action needed by user: merge the branch (deploy), then re-validate via
        Google Rich Results Test / GSC URL inspection on /reviews.

## Result
- ratingValue: 5.0
- reviewCount: 12
- bestRating: 5
