# Lessons

## /reviews structured-data fix (2026-06-13)
- The task brief hypothesized "standalone Review items not nested under a
  parent." Actual markup already nested the 5 reviews under one `#business`
  entity; the only real defect was the missing `aggregateRating` sibling.
  Corrected the approach after reading the file rather than assuming.
- The page displayed 12 review cards but marked up only 5. Marked up all 12
  so `reviewCount` honestly matches visible content. Used ratingValue 5.0 /
  reviewCount 12 (the average and count of reviews actually on the page),
  NOT the "450+ Google reviews" marketing figure, which would violate
  Google's spam policy (markup must match visible content).
