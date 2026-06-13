# Goal — Vagaro → talech (Elavon) Booking Migration

**Date:** 2026-06-12 · **Scope:** elitespautah + jmassage-website
**Spec/Plan:** `docs/superpowers/{specs,plans}/2026-06-12-vagaro-to-talech-booking-migration*.md`

## Goal
Replace all Vagaro booking/gift integration on both spa sites with Elavon **talech** microsite link-outs — booking → talech `/shop/`, gift cards → talech `/gift-card/` — via branded, new-tab handoffs that keep `/book` and `/gift-cards` as real on-brand pages.

## Success criteria
- `grep -i vagaro` returns **0 hits** in shipped files (html/css/js/py/_redirects/_headers/txt) of both repos (docs excluded).
- All four talech URLs wired byte-exact: JM `/shop/` + `/gift-card/`, Elite `/shop/` + `/gift-card/`.
- `/book` and `/gift-cards` stay indexable; phone fallback on every handoff; new-tab links carry `rel="noopener"`.
- Elite generated service pages unchanged after `build_services.py` (no regen dependency); both sites serve clean locally.
- No mojibake introduced (UTF-8 preserved).

## Non-goals
- No redesign beyond swapping the embed for a handoff CTA.
- No pricing, service-content, or motion changes.
- No Cloudflare `_headers` changes.
- No deploy without Andrew's explicit okay.

## Constraints
- Elite on `redesign-50k` (don't disturb the existing stash); J Massage on a new `vagaro-to-talech` branch off `main`.
- Commit only when Andrew approves; he runs `/ultrareview` before deploy.
- talech is link-out only (not iframe-embeddable).
