# Lessons

## Fix: GSC "Multiple reviews without aggregateRating" on /reviews (2026-06-12)

- This is a static HTML site (no build step / no shared layout templating).
  JSON-LD is inline per-page; "rendered" output == the file contents.
- The `#business` entity (@id https://jmassageslc.com/#business) is duplicated
  across many pages but consistently uses the same @id, so cross-page reference
  works without redeclaration. No dedupe needed beyond confirming consistency.
- Correction needed: the JSON-LD originally marked up only 5 reviews while the
  page visibly displays 12 review cards (all 5-star). To make aggregateRating
  match visible content per Google's spam policy, expanded the nested `review`
  array to all 12 displayed reviews. reviewCount=12, ratingValue=5.0 — NOT the
  marketing "450+ / 5.0" figure shown in the hero, which would be inflated vs
  the actually-marked-up reviews.
- Root cause was simply a missing `aggregateRating` sibling to an already-nested
  `review` array — the reviews were NOT standalone. Minimal structural fix.
- Left services/foot-massage-head-spa.html alone: it references a different
  business entity (elitespautah.com/#business), not J Massage SLC.
