# Design: Clear GSC Product / Merchant structured-data warnings on jmassageslc.com

**Date:** 2026-06-24
**Repo:** `C:\Users\goho2\jmassage-website` (branch `main`)
**Status:** Approved (Andrew, 2026-06-24)

## Problem

Google Search Console reports four non-critical structured-data warnings on jmassageslc.com:

- **Merchant listings:** Missing field `hasMerchantReturnPolicy` (in `offers`); Missing field `shippingDetails` (in `offers`).
- **Product snippets:** Missing field `review`; Missing field `aggregateRating`.

All four are "non-critical" — the page still appears in Search; these are enhancement suggestions, not errors.

## Root cause

`gift-cards.html` contains the site's **only** `@type: Product` node (JSON-LD block #1, lines ~26–55), with a priced `Offer`. Google validates that node under both the Product-snippets and Merchant-listings rich-result programs and reports the recommended fields it lacks.

Verified facts:
- Both GSC reports are `Product`-based (confirmed against Google Search Central: developers.google.com/search/docs/appearance/structured-data/product). "Product snippets" can only originate from a `Product` node.
- `gift-cards.html` is the only `Product` on the site (89 JSON-LD type-tags across 19 files; one `Product`).
- Service pages and `pricing.html` use `Service` / `OfferCatalog`, which the Product reports do not target.
- `hasMerchantReturnPolicy`, `shippingDetails`, `aggregateRating`, `review` are all documented as **recommended / enhancement** (non-critical).

## Hard constraints

- **No fabricated reviews or ratings.** The 477 Google reviews (4.4★) belong to the *business*, not the *gift-card product*; Google requires product ratings to describe that specific product. Attaching them to a gift-card `Product` would be misrepresentation. Therefore `review` / product-`aggregateRating` cannot be honestly supplied and will NOT be added.
- **Do not clobber uncommitted work.** The working tree carries an unrelated in-flight change: footer email + Privacy Policy / Terms links across 20 files, plus untracked `privacy-policy.html` and `terms.html`. None of it touches JSON-LD. It must remain untouched. Commits in this work use explicit file paths only — never `git add -A`/`git add .`.

## Decision

**Drop the `Product` framing on `gift-cards.html`** (chosen over keeping `Product` + adding merchant fields).

Rationale: keeping `Product` could clear only the two Merchant-listing warnings (return policy + shipping are honestly answerable for a gift card); the two Product-snippet warnings would persist because we will not invent product reviews. Removing the `Product` type removes both validations entirely and clears all four warnings with zero fabrication, in a single file.

**Scope:** `gift-cards.html` only. After deploy, use GSC "Validate Fix." If any service/pricing URL later appears in either report, handle in a separate follow-up pass.

## Change detail

One JSON-LD block changes. Block #2 (`FAQPage`, lines ~57+) is unchanged.

### Before (block #1, `gift-cards.html` lines ~26–55)

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "J Massage SLC Gift Card",
  "description": "Digital gift card redeemable for any massage service at J Massage SLC in Salt Lake City. Available in any amount from $25–$500. Delivered instantly by email. Never expires.",
  "brand": {"@type": "Brand", "name": "J Massage SLC"},
  "offers": {
    "@type": "Offer",
    "priceCurrency": "USD",
    "price": "50",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "url": "https://microsite.talech.com/gift-card/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7"
  },
  "seller": {
    "@type": "LocalBusiness",
    "name": "J Massage SLC",
    "image": "https://jmassageslc.com/og-image-v4.jpg",
    "telephone": "+18012881118",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "677 S 200 W Suite #C",
      "addressLocality": "Salt Lake City",
      "addressRegion": "UT",
      "postalCode": "84101"
    }
  }
}
```

### After (block #1 replacement)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "J Massage SLC",
  "image": "https://jmassageslc.com/og-image-v4.jpg",
  "telephone": "+18012881118",
  "url": "https://jmassageslc.com/gift-cards",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "677 S 200 W Suite #C",
    "addressLocality": "Salt Lake City",
    "addressRegion": "UT",
    "postalCode": "84101"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.4",
    "reviewCount": "477",
    "bestRating": "5"
  },
  "makesOffer": {
    "@type": "Offer",
    "name": "J Massage SLC Gift Card",
    "description": "Digital gift card redeemable for any massage service at J Massage SLC in Salt Lake City. Delivered instantly by email. Never expires.",
    "url": "https://microsite.talech.com/gift-card/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "minPrice": "25",
      "maxPrice": "500",
      "priceCurrency": "USD"
    }
  }
}
```

### What changed and why

- `@type` `Product` → `LocalBusiness` (the entity is the business that *offers* gift cards). Removes Product-snippet + Merchant-listing validation.
- `offers` (priced `Offer`) → `makesOffer` (`Offer` describing the gift card). An `Offer` under a `LocalBusiness`'s `makesOffer` is not a product offer, so it is not merchant-validated.
- Single `"price": "50"` → `priceSpecification` `minPrice 25` / `maxPrice 500`. More accurate (true range), and avoids a single misleading price point.
- `aggregateRating` 4.4 / 477 added to the `LocalBusiness` node — legitimate (business reviews on the business entity), consistent with the sitewide LocalBusiness pattern. NOT on a product.
- `brand`, `priceValidUntil` dropped (Product-only concepts no longer needed).
- `review` / product `aggregateRating` deliberately omitted — no honest product-level data exists.

## Acceptance criteria

1. `gift-cards.html` contains zero `@type: Product` nodes; block #1 validates as `LocalBusiness` + `makesOffer`.
2. Google Rich Results Test on the deployed page reports no Product or Merchant-listing items (and no errors/warnings for them).
3. JSON-LD is valid JSON (parses) and renders in the page head as before.
4. Block #2 (`FAQPage`) byte-identical to pre-change.
5. No other tracked file modified by this change; the pre-existing uncommitted footer/legal changes remain present and unstaged.
6. Visible page content (prices, copy, talech buy link) unchanged.

## Verification

- Local: extract block #1 JSON and parse (JSON validity); confirm no `"Product"` substring remains in the gift-cards JSON-LD.
- Post-deploy: Rich Results Test (search.google.com/test/rich-results) on https://jmassageslc.com/gift-cards → expect no Product/Merchant results.
- GSC: open both reports → "Validate Fix."

## Out of scope

- Service pages and `pricing.html` schema (separate follow-up only if GSC flags them).
- The Vagaro→talech POS migration.
- The footer / Privacy Policy / Terms rollout (already in progress, untouched).

## Rollback

Single-file, single-block change. Revert via `git checkout` of the one commit, or restore the Before block. No data migration, no dependencies.

## Deploy

Cloudflare Pages (per repo deploy method). Push to `main` after the change is committed on its own commit (gift-cards.html only).
