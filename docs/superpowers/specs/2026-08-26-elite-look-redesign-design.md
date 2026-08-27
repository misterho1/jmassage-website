# J Massage SLC — Elite-look redesign (design spec)

Date: 2026-08-26 · Branch: `redesign/elite-look` · Goal: `goal.md` (repo root)

Restyle jmassageslc.com to the elitespautah.com design language — colorway, typography, imagery, copy register — while keeping JM's structure, motion layer, facts (4.4★/477), and massage-only topic ownership.

Approved approach: **Hybrid skin swap** (token palette + font trio + imagery regeneration + copy register pass). Rejected: token-swap-only (misses typography/register), full structural port of Elite's HTML/CSS (31 hand-authored pages, ~15 header variants — weeks of risk for no extra resemblance).

> Autonomy note: session was non-interactive; brainstorm questions could not be asked live. Assumptions are marked ⚑. Andrew reviews this spec and the preview before anything ships.

## 1. Colorway

Rewrite the token values in `css/styles.css:16-75` to Elite's palette (hex/rgba, dropping OKLCH ⚑ — consumers all use `var()`, so values swap cleanly). Token NAMES stay (`--lantern` etc.) so no consumer edits are needed.

| JM token | New value (Elite role) |
|---|---|
| `--timber` | `#faf7f3` (brand-cream, page bg) |
| `--soot` | `#f5f0e8` (cream-soft, alt bands) |
| `--char` | `#ebe2d2` (cream-deep) |
| `--ember` | `#fffdfb` (surface) |
| `--pool` | `#2a2622` (ink) |
| `--slate` | `#2a2622` (ink) |
| `--pool-warm` | `#1f1a16` (ink-deep) |
| `--lantern` | `#a04d2c` (terracotta accent) |
| `--amber` | `#7d3d23` (accent deep / hover) |
| `--glow` | `#c9805a` (light terracotta, on-dark) |
| `--lantern-dim/-mid/-hi` | `rgba(160,77,44,.10/.22/.45)` |
| `--text-hi` | `#2a2622` · `--text-mid` `#5b544c` · `--text-lo` `#6b6358` · `--text-dim` `rgba(42,38,34,.5)` |
| `--border` / `--border-mid` | `rgba(42,38,34,.10)` / `.20` · `--border-hi` `rgba(160,77,44,.5)` |
| `--star` | `#a04d2c` |
| `--shadow-*` | Elite's soft/lift/bloom values (`0 2px 12px rgba(42,30,22,.06)` etc.) |

Sweep the known non-token literals: `styles.css:478,1774,1843,1846`, `book.html:104,109`, `gift-cards.html:237`, `services/foot-massage-head-spa.html:616`, `css/service-page.css:22-25`, stale fallbacks (`thank-you.html:65` `#c79e6a`, `services/swedish-massage.html:471`, and any `var(--x, <literal>)` grep hits).

Cache-bust: bump ALL pages to `styles.css?v=22` + `service-page.css?v=6` (also fixes the 4 neighborhood pages stuck on v16/v4).

## 2. Typography

- `--font-head` / `--font-display` → `'Marcellus', Georgia, serif`
- `--font-body` → `'PT Serif', Georgia, serif` (serif body = Elite's editorial feel)
- New `--font-ui: 'DM Sans', system-ui, sans-serif`; point nav links, buttons, eyebrows, meta labels, form labels at it in `styles.css` (bounded selector set). `service-page.css:790-791` hardcoded Switzer stack → `var(--font-ui)`.
- Font links on all 31 pages: remove Fontshare Switzer; single Google Fonts request `DM+Sans:wght@400;500;600 & Marcellus & PT+Serif:wght@400;700` with Elite's preload+onload pattern. Fix `404.html:21` (currently requests Switzer from Google, which doesn't exist there).
- Marcellus has one weight (400) and no italic. JM's italic `<em>` accent convention converts to Elite-style color accent: `h1 em, h2 em, h3 em { font-style: normal; color: var(--lantern) }` (on dark bands: `--glow`). ⚑
- Keep `html { font-size: 18px }` and JM's clamp scale — scale is close enough to Elite's; changing it would ripple through inline-styled pages for no visible gain. ⚑

## 3. Imagery

All regenerated via Higgsfield `nano_banana_pro`, Elite's exposure family: warm candlelit amber, terracotta + cream, real-camera grain + imperfection (de-AI recipe). Continuity: generate the new JM hero FIRST, then seed every other shot from that one anchor (one room, one exposure family — massage room, never facial/spa-table crossover). Same filenames + dimensions as current assets = drop-in replacement, no HTML churn for stills.

Wave 1 — core visible set (index + og):
- `hero-room.webp` 2752×1536 + `hero-room-portrait.webp` (9:16)
- `session-room / session-oil / session-hands / session-exhale` (+ 4 portrait cuts)
- `service-body / service-head / service-foot` 928×1152 (portrait-native cards)
- `service-couples.webp` 1376×768, `detail-towels.webp` 928×1152
- `og-image-v4.jpg` → regenerate as `og-image-v5.jpg` 1200×630 + update the 28 meta references

Wave 2 — service pages: `images/services/{slug}-1/-2.webp` (~17 files), seeded from the same anchor. Neighborhood pages keep reusing the deep-tissue pair.

Video ⚑: new stills orphan the current ambient loops. Regenerate `hero-ambient.mp4` (landscape + portrait) image-to-video from the new hero still; same for `cta-afterglow` (from session-exhale) and `couples-ambient` (from service-couples, ALSO gets its missing portrait cut). Fallback if video gen underdelivers: remove `data-src` attrs on the affected element — motion layer degrades gracefully to the still.

Quality bar: "$10k designer" — same subject continuity, no duplicate frames, fresh generation per camera angle. No fabricated "real client" imagery; interim-AI status noted same as Elite.

## 4. Copy

Elite register: short declarative sentences, second person, warm and direct, sentence-case headlines with terminal periods, no em-dashes, numbers stated plainly. Voice rules: no emojis, no exclamation points, we/you. JM facts only: 4.4★/477, $85/$125/$165, 10am–10pm daily, (801) 288-1118.

Rewrite scope (hand-edit, page by page):
- `index.html` — full pass (hero, session captions, services, pair, process, about, CTA, footer blurb). Keep the pull-quote a single text node (motion.js word-splits it).
- `about.html` — register pass + fix the broken pull-quote attribution (leading comma, missing name).
- `pricing.html`, `reviews.html`, `contact.html`, `faq.html` heroes + section heads.
- `gift-cards.html` — register pass + fix "six massage modalities" claim.
- `massage-salt-lake-city.html` — fix "Six Elite Modalities" + stray space before comma (`:567`).
- 4 neighborhood page heroes — register pass only.
- `services/*.html` — shared labels/CTAs only; unique SEO body copy stays. Blog posts untouched.

Modality-count conflict (14 vs 6): standardize on the real count taken from the live pricing/services list during execution; where ambiguous, drop the numeral rather than invent one.

## 5. Explicitly out of scope

Header/footer variant consolidation (15/12 variants — flag, don't fix). `services/myofascial.html` double JS load. Dead CSS (`.hero` block) and dead images. FAQ/gift-cards missing JS drivers. Any structural/layout rebuild. Any elitespautah.com edit. Pricing/NAP/services changes.

## 6. Verification

- `node ~/projects/exclusiveut/tools/verify-jmassage.mjs` passes.
- Local preview screenshots: desktop + 375px (full cinematic tier on mobile), hero/video crossfade sane.
- Encoding gate: zero `Â`/`â€` artifacts, ★ U+2605 preserved (byte-check after every scripted mutation).
- Grep gates: no `Switzer`/`Fraunces`/`fontshare` remnants; no `oklch(` outside comments; no stale `?v=16|?v=4`.
- Ship only via `/ship` (Lighthouse 90+ gate) after Andrew's explicit go.
