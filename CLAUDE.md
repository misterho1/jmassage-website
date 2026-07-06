# jmassageslc.com — project instructions

J Massage SLC. Static hand-authored HTML on Cloudflare Pages (git-connected: push to `main` = production deploy — use `/ship`).
NAP: (801) 288-1118 · 677 S 200 W Suite C, Salt Lake City UT 84101 · daily 10am–10pm · booking at /book (GHL).

## Encoding — the repo's scar tissue
This repo once shipped CP1252 mojibake. Every file stays UTF-8. Star glyph is ★ (U+2605), never ⭐ emoji. If you see Â or â€™ artifacts anywhere, stop and fix the encoding before anything else.

## Topic ownership (shared strategy with Elite Spa Utah)
J Massage owns massage modalities. Facials, sauna, reflexology, head spa belong to elitespautah.com — never build the same keyword on both. The spa-blog / spa-gbp-post / spa-service-page skills enforce this.

## Facts
- Pricing: standard $85/$125/$165 (60/90/120) · premium (couples, 4-hand) $165/$245/$325 · add-ons $30 (cupping $20) · prenatal 105/155/205.
- Service pages live at `services/{slug}.html`. No generator script — copy an existing `services/*.html` as the template and keep body copy unique per page.
- Real rating: 4.4/477 on Google. Use real numbers only.
- Cinematic layer is live. Mobile portrait uses the `data-src-portrait` pattern (9:16 sources swapped in ≤768px) — new hero/section media needs a portrait cut, not a center-crop of the landscape file. Mobile gets the FULL cinematic tier; Andrew reviews on iPhone.

## Verify
`node ~/projects/exclusiveut/tools/verify-jmassage.mjs` after layout/motion changes (harness lives in the exclusiveut repo on purpose).
