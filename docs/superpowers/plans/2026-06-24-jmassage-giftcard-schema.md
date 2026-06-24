# Gift-Card Schema De-Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the only `@type: Product` node on jmassageslc.com (in `gift-cards.html`) so all four non-critical GSC Product/Merchant structured-data warnings clear, with zero fabricated reviews.

**Architecture:** Static HTML site; JSON-LD is hand-authored per page in `<script type="application/ld+json">` blocks. `gift-cards.html` has two blocks: #1 a `Product` (to be converted to `LocalBusiness` + `makesOffer`), #2 a `FAQPage` (unchanged). A small Python verifier in `tools/` (matching existing `tools/*.py` idiom) parses the page's JSON-LD and asserts the post-change shape. Deploy is Cloudflare Pages via push to `main`.

**Tech Stack:** HTML5, Schema.org JSON-LD, Python 3 (stdlib `json`/`re` only), git, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-06-24-jmassage-giftcard-schema-design.md`

## Global Constraints

- **No fabricated reviews/ratings.** Do NOT add `review` or a product-level `aggregateRating`. The only `aggregateRating` allowed is `4.4` / `477` on the `LocalBusiness` node (real business data).
- **Never `git add -A` / `git add .` / `git commit -a`.** The working tree has unrelated uncommitted work (footer email + Privacy/Terms links across 20 files; untracked `privacy-policy.html`, `terms.html`). Stage only the exact files each task names, by explicit path.
- **Only one site-content file changes:** `gift-cards.html`. Plus the new `tools/verify-giftcard-schema.py`. No other tracked file may be modified.
- **Do not modify block #2 (`FAQPage`)** in `gift-cards.html`.
- **UTF-8 only.** Save `gift-cards.html` as UTF-8; introduce no mojibake. The new JSON-LD is plain ASCII (no en/em dashes) by design.
- **Repo:** `C:\Users\goho2\jmassage-website`, branch `main`.

---

### Task 1: Convert the gift-card `Product` to `LocalBusiness` + `makesOffer` (TDD)

**Files:**
- Create: `tools/verify-giftcard-schema.py`
- Modify: `gift-cards.html` (JSON-LD block #1, lines ~26–55 — the `Product` block only)

**Interfaces:**
- Consumes: nothing.
- Produces: `tools/verify-giftcard-schema.py` exits `0` (PASS) when `gift-cards.html` JSON-LD has no `Product` type, block #1 is `LocalBusiness` with a `makesOffer` `Offer`, a `FAQPage` block is present, and every block is valid JSON; exits `1` (FAIL) otherwise. Run as `python tools/verify-giftcard-schema.py`.

- [ ] **Step 1: Write the verifier (the failing test)**

Create `tools/verify-giftcard-schema.py`:

```python
#!/usr/bin/env python3
"""Verify gift-cards.html JSON-LD after de-Product change.

PASS conditions:
  - every <script type="application/ld+json"> block parses as JSON
  - NO node anywhere uses @type "Product"
  - the first block is @type "LocalBusiness" and has a "makesOffer" Offer
  - a "FAQPage" block is still present
Exit 0 on PASS, 1 on FAIL.
"""
import json
import re
import sys
import pathlib

HTML = pathlib.Path(__file__).resolve().parent.parent / "gift-cards.html"

LD_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.S | re.I,
)


def collect_types(node, acc):
    """Recursively gather every @type string in the JSON-LD tree."""
    if isinstance(node, dict):
        t = node.get("@type")
        if isinstance(t, str):
            acc.add(t)
        elif isinstance(t, list):
            acc.update(x for x in t if isinstance(x, str))
        for v in node.values():
            collect_types(v, acc)
    elif isinstance(node, list):
        for v in node:
            collect_types(v, acc)
    return acc


def main():
    text = HTML.read_text(encoding="utf-8")
    raw = LD_RE.findall(text)
    if not raw:
        print("FAIL: no application/ld+json blocks found")
        return 1

    parsed = []
    for i, body in enumerate(raw):
        try:
            parsed.append(json.loads(body))
        except json.JSONDecodeError as e:
            print(f"FAIL: block {i} is invalid JSON: {e}")
            return 1

    all_types = set()
    for b in parsed:
        collect_types(b, all_types)

    if "Product" in all_types:
        print("FAIL: a node still uses @type 'Product'")
        return 1

    b0 = parsed[0]
    if b0.get("@type") != "LocalBusiness":
        print(f"FAIL: block 0 @type is {b0.get('@type')!r}, expected 'LocalBusiness'")
        return 1
    offer = b0.get("makesOffer")
    if not isinstance(offer, dict) or offer.get("@type") != "Offer":
        print("FAIL: block 0 missing a makesOffer Offer")
        return 1

    if "FAQPage" not in all_types:
        print("FAIL: FAQPage block missing")
        return 1

    print(
        f"PASS: {len(parsed)} valid ld+json block(s); no Product; "
        f"block 0 LocalBusiness+makesOffer; FAQPage intact"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Run the verifier to confirm it FAILS against the current (Product) page**

Run: `python tools/verify-giftcard-schema.py`
Expected: `FAIL: a node still uses @type 'Product'` and exit code 1.

- [ ] **Step 3: Replace block #1 in `gift-cards.html`**

In `gift-cards.html`, replace the entire first JSON-LD block — from the opening `<script type="application/ld+json">` (line ~26) through its matching `</script>` (line ~55), the `Product` block — with exactly this. Leave the blank line and the second `<script ...>` (`FAQPage`) block that follow it untouched.

```html
  <script type="application/ld+json">
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
  </script>
```

- [ ] **Step 4: Run the verifier to confirm it PASSES**

Run: `python tools/verify-giftcard-schema.py`
Expected: `PASS: 2 valid ld+json block(s); no Product; block 0 LocalBusiness+makesOffer; FAQPage intact` and exit code 0.

- [ ] **Step 5: Confirm no collateral file changes**

Run: `git status --short -- gift-cards.html tools/verify-giftcard-schema.py` → expect `M gift-cards.html` and `?? tools/verify-giftcard-schema.py`.
Run: `git diff --stat` → confirm the pre-existing 20 in-flight files are still listed as modified (untouched) and that `gift-cards.html` is the only newly-changed site page.

- [ ] **Step 6: Commit (explicit paths only)**

```bash
git add -- gift-cards.html tools/verify-giftcard-schema.py
git commit -m "fix(seo): de-Product gift-card schema to clear GSC Product/Merchant warnings

Convert the only @type:Product node (gift-cards.html) to LocalBusiness +
makesOffer. Removes Product-snippet and Merchant-listing validation, so all
four non-critical GSC warnings clear with no fabricated reviews. Business
aggregateRating (4.4/477) now sits on LocalBusiness; price expressed as a
\$25-\$500 PriceSpecification. Adds tools/verify-giftcard-schema.py.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Verify only the intended files were committed: `git show --stat HEAD` → exactly `gift-cards.html` and `tools/verify-giftcard-schema.py`.

---

### Task 2: Deploy and verify the fix live

**Files:** none (deploy + external validation).

**Interfaces:**
- Consumes: the commit from Task 1 on `main`.
- Produces: a deployed `https://jmassageslc.com/gift-cards` with no Product/Merchant rich-result items; GSC validation started.

- [ ] **Step 1: Push to deploy**

Run: `git push origin main`
Expected: push succeeds; Cloudflare Pages builds (per repo deploy method). Note: this also publishes whatever else is already committed on `main`, but NOT the uncommitted footer/legal work (still unstaged) — confirm with `git status --short` that those 20 files remain modified/unstaged after push.

- [ ] **Step 2: Confirm the live page serves the new JSON-LD**

After the Pages deploy finishes (~1–2 min), fetch the live page and confirm `"@type": "LocalBusiness"` is present in the first JSON-LD block and `"Product"` is absent.
Run: `curl -s https://jmassageslc.com/gift-cards | grep -i -E '"@type": "(Product|LocalBusiness)"'`
Expected: shows `LocalBusiness`, does NOT show `Product`.

- [ ] **Step 3: Google Rich Results Test**

Open `https://search.google.com/test/rich-results` and test `https://jmassageslc.com/gift-cards`.
Expected: no "Merchant listings" or "Product snippets" items detected (FAQ may still be detected). No errors/warnings for Product or Merchant.

- [ ] **Step 4: GSC Validate Fix**

In Search Console for jmassageslc.com, open both reports — "Merchant listings" and "Product snippets" — and click **Validate Fix** on each. Record the validation start.

- [ ] **Step 5: Report**

Summarize: commit hash, live-page confirmation, Rich Results Test result, and that GSC validation is pending (Google re-crawls over days). Note the residual follow-up trigger: if any service or `pricing.html` URL appears in either GSC report later, open a separate pass to de-merchant those `Offer` nodes (kept out of scope here).

---

## Self-Review

**1. Spec coverage:**
- Root cause / decision (drop Product) → Task 1, Step 3. ✓
- Exact After JSON-LD → Task 1, Step 3 matches spec verbatim. ✓
- No fabricated review/rating → Global Constraints + verifier asserts no Product (so no product-rating path); only LocalBusiness aggregateRating present. ✓
- Don't clobber uncommitted work → Global Constraints + Task 1 Steps 5–6 + Task 2 Step 1 (explicit-path staging, status checks). ✓
- Acceptance criteria (no Product, valid JSON, FAQ unchanged, no other files touched, visible content unchanged) → verifier covers Product/JSON/FAQ; Steps 5/`git show --stat` cover file isolation; block #2 untouched by construction. ✓
- Verification (Rich Results Test, GSC Validate Fix) → Task 2. ✓
- Scope = gift-cards only; follow-up note → Task 2 Step 5. ✓

**2. Placeholder scan:** No TBD/TODO; verifier and replacement JSON are shown in full; commands have expected output. ✓

**3. Type consistency:** Verifier checks `@type` `LocalBusiness` + `makesOffer`→`Offer` + `FAQPage`; these match the replacement block in Step 3 exactly. ✓

No gaps found.
