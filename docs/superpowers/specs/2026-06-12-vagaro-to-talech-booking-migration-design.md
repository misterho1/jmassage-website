# Vagaro → talech (Elavon) Booking Migration — Design

- **Date:** 2026-06-12
- **Status:** Design approved — awaiting spec review, then implementation plan
- **Repos:** `elitespautah` (branch `redesign-50k`), `jmassage-website` (feature branch off `main`)
- **Author:** Claude (`/ultraplan` workflow)
- **Mirrored:** identical copy lives in both repos' `docs/superpowers/specs/`

## Context

Both sites currently embed **Vagaro** as the booking + gift-card processor. The businesses are switching POS to **Elavon**, whose customer-facing storefront is a hosted **talech microsite**. Vagaro must be fully removed and replaced with talech links.

talech microsites are **link-out destinations** (open in a new tab), not embeddable iframes — confirmed by the `target="_blank"` integration snippet supplied and a `403` returned to non-browser requests. The embedded `/book` iframe model is therefore replaced by a branded handoff.

## Goal

- Remove every Vagaro reference from shipped files in both repos (0 `grep -i vagaro` hits in html/css/js/py/_redirects/_headers/txt).
- Route all booking to the talech `/shop/` link and all gift-card purchase to the talech `/gift-card/` link, per site.
- Preserve UX, SEO (indexable `/book` + `/gift-cards`, intact JSON-LD), brand, and phone fallback.

## Non-goals

- No redesign of the booking or gift-card pages beyond swapping the embed for a handoff CTA.
- No change to service content, pricing, motion system, or unrelated copy.
- No change to Cloudflare security headers (no Vagaro reference there; `X-Frame-Options` is unaffected by an outbound link).
- Historical dated spec docs left as historical record; only `PRODUCT.md` updated to current state.

## talech URLs (single source of truth)

| Purpose | J Massage | Elite Spa |
|---|---|---|
| Booking (`/shop/`) | `https://microsite.talech.com/shop/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7` | `https://microsite.talech.com/shop/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg` |
| Gift card (`/gift-card/`) | `https://microsite.talech.com/gift-card/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7` | `https://microsite.talech.com/gift-card/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg` |

## Decisions

1. **Booking model = branded handoff.** `/book` stays a real, indexable page. Its Vagaro iframe is replaced by a hero + primary CTA button that opens the talech booking microsite in a new tab (`target="_blank" rel="noopener"`), retaining the existing phone fallback. All existing "Book Now" CTAs (nav, footer, hero, generated service pages, JSON-LD `offers.url`) continue pointing at the internal `/book` and need no change. The talech booking URL appears in exactly one file per site (`book.html`).
2. **Gift cards = talech `/gift-card/` link.** Gift purchase CTAs open the talech gift-card microsite in a new tab. (Elite previously routed gift purchase to `/book`; it now points to Elite's `/gift-card/` link.)
3. **Processor name = neutral copy.** Visible "Vagaro" mentions become neutral ("Secure online checkout" / "Processed securely"). No processor brand name shown to customers.

## Architecture

- **Single-source-of-truth links:** booking URL only in `book.html`; gift URL only in gift touchpoints.
- **No header changes:** `_headers` carry no Vagaro reference; `X-Frame-Options: SAMEORIGIN` governs *being framed*, not outbound links.
- **No regen dependency (Elite):** `build_services.py` output references only `/book`; the migration does not change generated markup, so a rebuild is functionally a no-op (except the pricing comment).

## Change inventory

### Elite Spa — `elitespautah` (branch `redesign-50k`)
| File | Change |
|---|---|
| `book.html` | Replace iframe `<section>` + skeleton + inline `.booking-frame-wrap` `<style>` (≈ lines 19–68, 102–120) with a branded handoff: keep hero, add primary button → Elite **booking** URL (`target="_blank" rel="noopener"`), keep phone line. Remove `vagaro.com` preconnect (line 16); add `microsite.talech.com` preconnect. |
| `gift-cards.html` | Repoint the two "Buy a Gift Card" CTAs (≈ lines 74, 114) from `/book` to Elite **gift** URL (`target="_blank" rel="noopener"`). |
| `build_services.py` | Line 7 comment: remove "Vagaro" (neutral wording). No regen required. |
| `_redirects` | Update the line-3 comment referencing the Vagaro iframe. Confirm no active Vagaro redirect rule. |
| `PRODUCT.md` | Update the "embedded Vagaro booking widget at /book" line to describe the talech handoff. |

### J Massage — `jmassage-website` (feature branch off `main`)
| File | Change |
|---|---|
| `book.html` | Replace iframe `<section>` (≈ lines 98–114) with branded handoff → JM **booking** URL; keep the phone fallback line; drop the Vagaro fallback link. |
| `gift-cards.html` | Set purchase button (`#giftPurchaseBtn`) to JM **gift** URL — fix both the static `href` (≈ line 510) and the inline JS that assigns the Vagaro URL (≈ line 551). Neutralize 3 copy lines: "Secure purchase via Vagaro" (≈ 482), "Processed securely by Vagaro." (≈ 515), FAQ "...through Vagaro." (≈ 657). |
| `services/*.html` (14 files) | Each contains the same gift-purchase block referencing the Vagaro gift URL; swap all 14 to the JM **gift** URL via one consistent pattern. Files: 4-hand-massage, ashiatsu, couples-massage, deep-tissue, foot-massage-head-spa, hot-stone, infrared-sauna, myofascial, prenatal, reflexology, shiatsu, sports-massage, swedish-massage, thai-massage. |
| `css/styles.css` | Remove dead `.book-embed` iframe rules + Vagaro comments (≈ 1691, 1771–72). New CTA reuses existing `.btn` / `.btn--gold`. |
| `PRODUCT.md` | Update the Vagaro mention. |

## Data flow

`Book Now` (any CTA) → internal `/book` → primary button → new tab → talech `/shop/`.
`Buy Gift Card` (gift-cards page or service block) → new tab → talech `/gift-card/`.

## Error handling / resilience / SEO

- Every handoff retains a visible phone number; if talech is unreachable, the phone path remains.
- `rel="noopener"` on all new-tab links (no `window.opener` leakage).
- `/book` and `/gift-cards` remain real, indexable pages; JSON-LD `offers.url` (`…/book`) still resolves 200.
- Canonical / OG tags unchanged.

## Verification (definition of done)

1. `grep -ri vagaro` = 0 hits across shipped files in both repos (html/css/js/py/_redirects/_headers/txt). `PRODUCT.md` updated; dated specs exempt.
2. Elite: `python build_services.py` runs clean; `git diff` on generated service pages is empty (proves no regen dependency) aside from the intended comment.
3. Local serve + click-through: `/book` button → correct booking URL (new tab); `/gift-cards` button + ≥2 sampled service-page gift buttons → correct gift URL (new tab). Both sites.
4. All four talech URLs present byte-exact; no stray/legacy booking links.
5. Motion intact (no regression from removing the iframe section) — spot-check `/book` reveal.

## Deploy

- Confirm Cloudflare Pages deploy method per repo (git-connected push vs Direct-Upload/wrangler) from `reference_cloudflare_pages_deploys` before claiming deployed; fetch-before-edit done.
- Elite ships on `redesign-50k` (live working branch); do not disturb the existing stash.
- J Massage: branch off `main` for the change, then merge per Andrew.

## Risks / edge cases

- **talech gift vs shop semantics:** assumes `/gift-card/` link handles purchase end-to-end; not independently verifiable (403 to bots). Phone fallback mitigates.
- **J Massage gift amount selector:** current UI lets users pick an amount, but the Vagaro URL was static (amount not passed). talech likely handles amount on its side; selector retained as a cosmetic affordance. Flag if talech needs the amount in the URL.
- **Duplicated gift block across 14 service pages:** consistency risk; mitigated by a single search/replace pattern + grep verification.
- **Elite default branch:** changes live on `redesign-50k`, consistent with current live state per project memory.
