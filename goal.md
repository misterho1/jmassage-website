# Goal
Redesign jmassageslc.com's visual identity — imagery, colorways, and page copy — to match the elitespautah.com design language, while keeping J Massage's own services, pricing, NAP, and massage-modality topic ownership intact.

## Success criteria
- Site-wide CSS color tokens updated to Elite's palette family; every page renders with the new colorway (no page left on the old scheme).
- New brand imagery set generated in Elite's style (same-room continuity, de-AI recipe), replacing current hero/section pictures, with 9:16 portrait cuts wired via the existing `data-src-portrait` pattern.
- Page copy rewritten in Elite's register and brand voice (no emojis, no exclamation points, we/you), using only real facts: 4.4★/477 Google rating, real JM prices ($85/$125/$165 etc.).
- `node ~/projects/exclusiveut/tools/verify-jmassage.mjs` passes; Lighthouse mobile 90+; all files UTF-8 with no mojibake.
- Work lands on branch `redesign/elite-look` with a local preview verified at 375px and desktop; production deploy happens only via /ship after Andrew's go (push to main = live).

## Non-goals
- No service, pricing, hours, or NAP changes; no new pages; no booking-flow changes.
- No edits to elitespautah.com.
- No topic crossover: no facials/sauna/reflexology/head-spa content added to JM.
- Not a 1:1 clone — Elite's design language applied to JM's own identity, ratings, and services.

## Constraints
- Static hand-authored HTML; service pages have no generator — copy-template per page.
- UTF-8 only; ★ (U+2605) never ⭐; repo has CP1252 scar tissue — check encoding on every edit.
- Mobile gets the FULL cinematic tier; Andrew reviews on iPhone.
- Never fabricate client photos, reviews, or stats; JM rating stays 4.4/477 (never Elite's 4.9/153).
