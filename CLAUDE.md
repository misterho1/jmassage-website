# jmassageslc.com — project instructions

J Massage SLC. Static hand-authored HTML on Cloudflare Pages (git-connected: push to `main` = production deploy — use `/ship`).
NAP: (801) 288-1118 · 677 S 200 W Suite C, Salt Lake City UT 84101 · daily 10am–10pm · booking at /book (GHL).

## Encoding — the repo's scar tissue
This repo once shipped CP1252 mojibake. Every file stays UTF-8. Star glyph is ★ (U+2605), never ⭐ emoji. If you see Â or â€™ artifacts anywhere, stop and fix the encoding before anything else.

## Topic ownership (shared strategy with Elite Spa Utah)
One spa wins each shared service on Google (Andrew, 2026-11-10). J Massage wins Swedish, ashiatsu, sports, shiatsu, prenatal and 4-hand. Elite Spa Utah (elitespautah.com) wins deep tissue, head spa, couples massage, foot reflexology, Spa Day Combo and packages. Deep tissue is split: Elite's page wins on Google, the deep tissue microsite keeps sending people to J Massage, and `services/deep-tissue.html` here is not touched and gets no link to Elite, because J Massage ads use it. A page that does not win stays up, gets no new work, and carries one plain link to the sister spa's page. Exception: an ad landing page never gets a link to the sister spa. Facials and sauna stay with elitespautah.com as before. Never build the same keyword on both. The spa-blog / spa-gbp-post / spa-service-page skills enforce this.

## Facts
- Pricing (mirrors pricing.html; since 2026-11-01): massage $65/$105/$155/$205 (30/60/90/120; Swedish, sports, ashiatsu, shiatsu, myofascial all one rate; 30 min is booked by phone only) · deep tissue $105/$155/$205, the massage rate (60/90/120; promotion since 2026-11-07, Andrew: no extra charge, no end date; pages show the old $125/$185/$245 or +$20/+$30/+$40 struck with `.promo-was`, then the new price or `.promo-free` "Free"; no 30-min price set) · prenatal $105/$155/$205 (60/90/120) · couples & 4-hand $205/$305/$405 (60/90/120) · add-ons: hot stones $20, cupping $20, dōTERRA essential oils $20, 30-min infrared sauna $30, CBD $30, 30-min prenatal extension $50 · listed prices are card prices; cash is $5 less.
- Service pages live at `services/{slug}.html`. No generator script — copy an existing `services/*.html` as the template and keep body copy unique per page.
- FAQ: the visible FAQ is the source. After editing FAQ copy, run `python tools/sync-faq-schema.py` so the FAQPage JSON-LD matches it (Google policy).
- Google tag: after adding or copying any page, editing a page's `<head>`, or changing a GA4 or Ads ID, run `python tools/inject-tracking.py` (a dry run). It lists every page that needs a fix, not only yours, so read each line. Then run it with `--apply`; a plain dry run must end with `0 file(s) need changes` and exit 0 before you push. Fix any `(skipped-...)` or `STALE-ID` line by hand. `LAZY-GTAG` means the page loads the tag through `js/after-paint.js`: copy the inline gtag stub from /book, never an eager loader.
- Real rating: 4.4/531 on Google (synced 2026-10-23). Site copy says "500+ Google reviews" on purpose so it does not go stale; keep it while the live count is 500 or more, and don't swap in the exact number. Use real numbers only.
- Design system = Elite's (css/site.css, js/motion.js, js/nav.js, js/ambient-video.js); same motion as elitespautah.com. Shared header/footer/phone bar: tools/twin/shell.html + tools/twin/apply-shell.mjs.

## Verify
`node ~/projects/exclusiveut/tools/verify-jmassage.mjs` after layout/motion changes (harness lives in the exclusiveut repo on purpose).

## Performance: homepage (2026-11-02)
index.html follows the /book pattern below (the tag, the chat, the live reviews fetch and the motion layer start after first paint), and the same don'ts apply. Its own contracts:
- The email wrapper follows the every-page rule below.
- The hero still (one preload, the same picture on every screen) is the LCP; on phones and upright tablets the still and the loop share one strip at the top of the hero (`--hero-strip` in css/site.css), so keep them in the same box; js/ambient-video.js swaps in the hero loop after first paint. The loop has no `poster` (posters load before first paint). Give every `<img>` and portrait `<source>` its real `width`/`height`.

## Performance: every page (2026-10-16)
Every page except /thank-you uses the /book loading pattern below: the tag loads through `js/after-paint.js` with `data-gtag="interaction"` (the inline gtag stub sits before the stylesheets, and ad-click URLs load the tag at parse), the chat and the motion layer (GSAP, ScrollTrigger, motion.js) through `js/defer-load.js`. /thank-you fires the Ads conversion, so it loads the tag at parse. A new page copies its `<head>` scripts and its chat tag from a page of the same template. Don't add sync scripts.
- Every visible email sits inside `<!--email_off-->…<!--/email_off-->`: otherwise Cloudflare's Email Address Obfuscation (a zone setting) injects a parser-blocking decoder script into production only (pages.dev previews don't get it).

## Performance: /book and /pricing (2026-09-25)
Both pages keep third-party work off the first-paint path for mobile Lighthouse 90+. The Google tag, the GHL chat and the /book calendar load through `js/after-paint.js` (`window.__afterPaint`). The tag waits for the first tap, scroll or key, or 5 s (`data-gtag="interaction"`); visits from another site or with `utm_*` load it at first paint, and ad-click URLs load it at parse. Fonts come from `/fonts` through `css/fonts.css`, and the motion layer loads through `js/defer-load.js` after first paint. Don't add sync scripts or Google Fonts links to these two pages.

## Fonts (every page)
Every page loads fonts from `/fonts` through `<link rel="stylesheet" href="/css/fonts.css?v=1">`. Never add a Google Fonts link or preconnect. Blog posts and general pages also preload `marcellus-latin` and `pt-serif-400-latin`. Pages that link `service-page.css` preload `marcellus-latin`, `pt-serif-400-latin` and `dm-sans-latin`, like the homepage and /book (2026-10-16). Under the every-page pattern the first frame paints before the fonts arrive, so a breadcrumb or button that wraps differently in the fallback font shifts the hero: /services/swedish-massage measured PSI 89 with CLS 0.16-0.20 without preloads, and 93-98 with CLS 0 with them. (PR #27 had dropped them under the old pattern.) /services/couples-massage still has none. A new page copies its font lines from a page of the same template. If `css/fonts.css` changes, bump `?v=` on every page.
