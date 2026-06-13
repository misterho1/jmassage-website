# Spa Pricing Restructure — Design Spec

- **Date:** 2026-06-13
- **Sites:** Elite Spa Utah (`elitespautah`) + J Massage SLC (`jmassage-website`)
- **Status:** Design approved — ready for implementation plan
- **Mirrored to:** both repos under `docs/superpowers/specs/`

## 1. Goal
Move both spa sites onto one simple tiered price model; demote three standalone services
(hot stone, cupping, infrared sauna) to paid add-ons; add a CBD add-on; add Prenatal as a
standard service; and make foot-reflexology + head-spa **Elite-exclusive**, with J Massage
referring those two to Elite as a sister location.

## 2. Approved decisions (clarifying Q&A, 2026-06-13)
1. **Add-ons:** hot stone, cupping, infrared sauna → **convert to add-ons only**. Delete the
   standalone service pages and 301-redirect the old URLs.
2. **30-minute tier:** **dropped** sitewide. New "from" price = **$85**.
3. **J Massage foot/reflexology/head-spa:** keep the pages but **convert to sister-location
   referrals** — retain the educational info, remove J Massage price + booking, link to the
   matching Elite service page(s), and show Elite's address. (Elite is operated by J Massage LLC.)
4. **Delivery:** commit the in-progress talech work as its own commit first, then make the
   pricing changes as a **separate commit**, on the existing branch in each repo.

## 3. Pricing model (both sites)

| Tier | 60 min | 90 min | 120 min |
|---|---|---|---|
| **Standard** | $85 | $125 | $165 |
| **Premium** (Couples, 4-Hand) | $165 | $245 | $325 |
| **Reflexology / Head Spa** — *Elite only* | $85 | — | — |

- **Add-ons, +$30 each, selected at booking:** Cupping · Hot Stones · Infrared Sauna (30 min) · CBD
- **No 30-minute sessions** anywhere.

## 4. Elite Spa — service mapping
Source of truth: `build_services.py` (regenerates the service detail pages).

| Service (slug) | Current (30/60/90/120) | New tier | New prices | Action |
|---|---|---|---|---|
| deep-tissue-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| swedish-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| sports-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| ashiatsu-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| shiatsu-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| individual-massage | 115/165/245/325 | Standard | 85/125/165 | reprice |
| **prenatal-massage** | — | Standard | 85/125/165 | **NEW page** |
| couples-massage | 115/165/245/325 | Premium | 165/245/325 | drop 30-min only |
| 4-hands-massage | 115/165/245/325 | Premium | 165/245/325 | drop 30-min only |
| foot-reflexology-massage | 115/165/245/325 | Reflexology | **$85 / 60 min** | reprice (single row) |
| head-spa-massage | 60/85/125 (30/60/90) | Head Spa | **$85 / 60 min** | reprice (single row) |
| chair-massage | 115/165/245/325 | (see Open Items) | **$60 / 30 min** | keep short-format (default) |
| hot-stone-massage | 115/165/245/325 | — | — | **DELETE → add-on, 301** |
| cupping-therapy | 115/165/245/325 | — | — | **DELETE → add-on, 301** |
| medical-infrared-sauna | 115/165/245/325 | — | — | **DELETE → add-on, 301** |

Also fix `related[]` arrays in `build_services.py` that point at deleted slugs
(hot-stone-massage, cupping-therapy, medical-infrared-sauna) → repoint to surviving services.

## 5. J Massage — service mapping
No generator; prices are hand-coded ~8× per page. Use an assertion-guarded Python edit script.

| Service (file) | Current 60/90/120 (30) | New tier | New prices | Action |
|---|---|---|---|---|
| swedish-massage | 90/130/165 (55) | Standard | 85/125/165 | reprice, drop 30 |
| deep-tissue | 95/135/170 (55) | Standard | 85/125/165 | reprice, drop 30 |
| sports-massage | 95/135/170 (60) | Standard | 85/125/165 | reprice, drop 30 |
| ashiatsu | 100/145 (60) | Standard | 85/125/165 | reprice, drop 30 |
| shiatsu | 80/120 | Standard | 85/125/165 | reprice |
| thai-massage | 85/125 | Standard | 85/125/165 | add 120, keep |
| myofascial | 95/140 | Standard | 85/125/165 | reprice |
| prenatal | 90/130 | Standard | 85/125/165 | reprice |
| couples-massage | 170/240/300 | Premium | 165/245/325 | reprice |
| 4-hand-massage | 165/230 | Premium | 165/245/325 | reprice, add 120 |
| hot-stone | 95/140 | — | — | **DELETE → add-on, 301** |
| infrared-sauna | +$35 / $45 standalone | — | — | **DELETE → add-on, 301** |
| reflexology | 55/90 | Referral | — | **sister-referral → Elite** |
| foot-massage-head-spa | 65/30min | Referral | — | **sister-referral → Elite** |

## 6. Add-ons presentation
- **Elite:** replace the generic add-on note in the page template with a real line; add an
  "Enhancements / Add-Ons" block on `services.html` listing Cupping, Hot Stones,
  Infrared Sauna (30 min), CBD — each **+$30**. Delete the 3 standalone pages; 301 → `/services`.
- **J Massage:** rewrite the "Enhancements & Add-Ons" section + the add-on rows in
  `pricing.html` to those four +$30 items (infrared sauna add-on $35→$30; remove the $45
  standalone). Delete hot-stone + infrared-sauna pages; 301 → `/pricing`. Remove both from the
  nav dropdown, footer treatments list, and homepage cards (duplicated into every page).

## 7. Sister-referral pages (J Massage)
Keep educational copy; remove JM price cards / "from $X" / booking CTAs for that service; add an
**"Available at our sister location — Elite Spa Utah"** panel with:
- `reflexology.html` → links to `https://elitespautah.com/foot-reflexology-massage`
- `foot-massage-head-spa.html` → links to `https://elitespautah.com/foot-reflexology-massage`
  **and** `https://elitespautah.com/head-spa-massage`
- Elite address **1136 S State Street, Salt Lake City, UT 84111**, phone **(801) 839-8880**,
  "Book at Elite Spa" CTA.
- Remove the `Offer`/price nodes from each page's JSON-LD so J Massage no longer schema-claims to
  sell the service; keep the page indexable/informational.

## 8. File inventory
**Elite (~8 files + generator):** `build_services.py` (model + SERVICES + template add-on line +
related[] fixups + regen) · delete `hot-stone-massage.html`, `cupping-therapy.html`,
`medical-infrared-sauna.html` · generate `prenatal-massage.html` · hand-edit `services.html`,
`index.html`, `home.html`, `faq.html`, `sitemap.xml`, `_redirects` · verify `gift-cards.html`
(gift amounts → likely no change).

**J Massage (~20 files):** rewrite `pricing.html` · reprice 10 service pages · referral-rewrite
`reflexology.html` + `foot-massage-head-spa.html` · delete + redirect `hot-stone.html`,
`infrared-sauna.html` · global nav/footer edits across all pages · `index.html`, `faq.html`,
`massage-salt-lake-city.html`, `llms.txt`, `llms-full.txt`, `sitemap.xml`, `_redirects` · verify
`gift-cards.html`/`about`/`contact`/`reviews` price mentions.

## 9. Implementation strategy
- **Elite:** edit the data + template in `build_services.py`, regenerate; delete the 3 pages;
  hand-edit the aggregator pages (`services.html`, `index.html`, `home.html`, `faq.html`,
  `sitemap.xml`) + `_redirects`.
- **J Massage:** assertion-guarded Python script for per-service repricing + nav/footer/homepage
  edits (exact old→new strings, asserted counts, idempotent — the talech-migration pattern);
  referral pages rewritten by hand; pages deleted + redirected by hand.

## 10. Delivery / git
Per repo: (1) commit the in-progress talech work as its own commit; (2) make pricing changes;
(3) commit as a separate "pricing restructure" commit. Stay on the current branch
(Elite `redesign-50k`, JM `vagaro-to-talech`). No push/deploy without Andrew. Final review pass
(`/ultrareview`) runs on the clean pricing diff.

## 11. Verification
Regenerate Elite; run a price-grep sweep on both repos for stray old numbers
(115/245/325 universal, 55/95/135/170/240/300/230/100/80/140/45/35); confirm 0 live references to
deleted slugs except 301 redirects; confirm referral pages carry no JM `Offer`/price and do carry
Elite links + address; spot-check rendered pages and schema validity.

## 12. Open items (defaults chosen; adjust if desired — non-blocking)
- **Chair massage (Elite):** ≤30-min format vs new 60/90/120 ladder → **default: keep Chair as a
  single 30-min session at $60**, outside the standard ladder.
- **Head Spa / Foot Reflexology durations (Elite):** "$85 for 1 hour" → **default: single 60-min
  $85 row** (old 30/90 tiers dropped). Add a 90-min upsell only if requested.
- **Gift-card pages:** amounts are gift denominations, not service prices → **no change**.
