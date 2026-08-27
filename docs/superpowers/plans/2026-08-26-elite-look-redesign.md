# Elite-Look Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle jmassageslc.com to the elitespautah.com design language (colorway, typography, imagery, copy register) per `docs/superpowers/specs/2026-08-26-elite-look-redesign-design.md`.

**Architecture:** Skin swap on JM's existing structure: token values rewritten in the single `:root` block, font trio replaced site-wide, imagery regenerated from one seeded anchor, copy register pass on core pages. No layout or motion-layer changes.

**Tech Stack:** Static HTML/CSS, Python one-shot mutators (repo convention), Higgsfield MCP (nano_banana_pro stills, image-to-video), Playwright verify harness.

## Global Constraints

- UTF-8 everywhere; ★ is U+2605, never ⭐. Byte-check after every scripted mutation (repo shipped mojibake once).
- Voice: no emojis, no exclamation points, we/you, short sentences. Elite register: sentence-case headlines with terminal periods, no em-dashes in body copy.
- Real facts only: 4.4★/477 Google, $85/$125/$165 (60/90/120), premium $165/$245/$325, prenatal 105/155/205, daily 10am–10pm, (801) 288-1118. Never Elite's 4.9/153.
- Topic ownership: massage modalities only; head-spa/facial/sauna stays a sister-location reference to Elite.
- Branch `redesign/elite-look`; never push to `main` (push = production). Deploy only via `/ship` after Andrew's go.
- Work file-by-file with Edit; scripted sweeps only via the checked patterns below.

---

### Task 1: Palette token swap + literal sweep + cache-bust

**Files:**
- Modify: `css/styles.css:16-75` (token block), `:478`, `:1774`, `:1843`, `:1846`, `:2951-2952`
- Modify: `css/service-page.css:22-25`
- Modify: `book.html:104,109` · `gift-cards.html:237` · `services/foot-massage-head-spa.html:616` · `thank-you.html:65` · `services/swedish-massage.html:471`
- Modify: all 30 rendering pages (cache-bust query strings)

**Interfaces:** Produces the final token values every later task renders against. Token NAMES unchanged.

- [ ] **Step 1: Rewrite token values** in `css/styles.css` `:root` to Elite palette (names stay):
  `--timber:#faf7f3` · `--soot:#f5f0e8` · `--char:#ebe2d2` · `--ember:#fffdfb` · `--pool:#2a2622` · `--slate:#2a2622` · `--pool-warm:#1f1a16` · `--lantern:#a04d2c` · `--amber:#7d3d23` · `--glow:#c9805a` · `--lantern-dim:rgba(160,77,44,.10)` · `--lantern-mid:rgba(160,77,44,.22)` · `--lantern-hi:rgba(160,77,44,.45)` · `--text-hi:#2a2622` · `--text-mid:#5b544c` · `--text-lo:#6b6358` · `--text-dim:rgba(42,38,34,.5)` · `--border:rgba(42,38,34,.10)` · `--border-mid:rgba(42,38,34,.20)` · `--border-hi:rgba(160,77,44,.5)` · `--star:#a04d2c` · `--shadow-gold:0 2px 12px rgba(42,30,22,.06)` · `--shadow-dark:0 10px 32px rgba(42,30,22,.10)` · `--shadow-card:0 24px 64px rgba(160,77,44,.16)` · `--glow-strong:rgba(160,77,44,.13)` · `--glow-rest:rgba(160,77,44,.07)`. Keep layout/radius/ease tokens untouched.
- [ ] **Step 2: Sweep hardcoded literals** at the file:line list above; replace with the matching token or Elite value (`#fff` frames → `var(--ember)`; gift-cards/foot-head inline oklch → rgba ink equivalents; stale fallback `#c79e6a` → `#a04d2c`). Then `grep -rn "oklch(" css/ *.html services/ blog/` — remaining hits must be zero (excluding this plan/spec).
- [ ] **Step 3: Grep stale fallbacks** `grep -rn "var(--[a-z-]*,\s*[#o]" *.html services/*.html blog/*.html css/` and fix any hit to a bare `var(--token)`.
- [ ] **Step 4: Cache-bust** every page to `styles.css?v=22` and `service-page.css?v=6` (catches the 4 neighborhood pages on v16/v4). Done when `grep -rln "styles.css?v=2[01]\|styles.css?v=16\|service-page.css?v=[45]" *.html services/*.html blog/*.html` returns nothing... (v=21→22 exact match; verify with `grep -rn "styles.css?v=" | grep -v "v=22"` → empty).
- [ ] **Step 5: Verify + commit.** `python -c "open checks"`-style byte scan: `grep -rn $'\xc3\x82\|\xc3\xa2' *.html css/` → empty; ★ count unchanged (`grep -o "★" -r *.html services/ blog/ | wc -l` = 78). `git add -A && git commit -m "Swap palette tokens to Elite colorway, sweep literals, bump cache"`.

### Task 2: Typography swap

**Files:**
- Modify: `css/styles.css:51-53` (+ UI-selector block), `css/service-page.css:790-791`
- Modify: all 31 pages' `<head>` font links (scripted, idempotent, in repo-convention style — new one-shot `tools/refont.py`)
- Modify: `404.html:21`

**Interfaces:** Produces `--font-head/--font-display = 'Marcellus', Georgia, serif`, `--font-body = 'PT Serif', Georgia, serif`, new `--font-ui = 'DM Sans', system-ui, -apple-system, sans-serif`.

- [ ] **Step 1: Token edits** in `styles.css`: set the three families above (add `--font-ui`).
- [ ] **Step 2: Point UI chrome at `--font-ui`** in `styles.css`: nav link, button, eyebrow/label, meta/badge, form-label rules (locate via `grep -n "font-family" css/styles.css`; any rule whose role is chrome/label switches to `var(--font-ui)`; body-copy rules stay `var(--font-body)`). `service-page.css:790-791` hardcoded Switzer stack → `var(--font-ui)`.
- [ ] **Step 3: Accent rule** appended to `styles.css`: `h1 em, h2 em, h3 em { font-style: normal; color: var(--lantern); }` plus on-dark variant scoped to the dark-band containers found via `grep -n "band-warm\|booking\b" css/styles.css` → `color: var(--glow)`.
- [ ] **Step 4: `tools/refont.py`** — one-shot idempotent mutator (pattern-match `tools/inject-tracking.py` style): removes the Fontshare `<link>` lines, replaces the Fraunces Google Fonts URL with `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap` (keep preload+onload+noscript pattern; PT Serif italic covers body `<em>`), drops the `api.fontshare.com` preconnect. Run with `--check` first, then apply to all 31 pages including `404.html`.
- [ ] **Step 5: Verify + commit.** `grep -rln "fontshare\|Switzer\|Fraunces" *.html services/*.html blog/*.html css/` → empty. Byte scan for mojibake again. Load `index.html` via local server, screenshot: Marcellus headings + PT Serif body render (fallback Georgia acceptable offline). `git add -A && git commit -m "Swap type system to Marcellus / PT Serif / DM Sans"`.

### Task 3: Imagery wave 1 (index editorial set + og-image)

**Files:**
- Replace (same names/dimensions): `images/editorial/hero-room.webp` (2752×1536), `hero-room-portrait.webp`, `session-room/-oil/-hands/-exhale.webp` (+4 portraits), `service-body/-head/-foot.webp` (928×1152), `service-couples.webp` (1376×768), `detail-towels.webp` (928×1152)
- Create: `og-image-v5.jpg` (1200×630); Modify: 28 pages' `og:image`/`twitter:image` meta

**Interfaces:** Produces the anchor image every wave-2 generation seeds from. Filenames unchanged → zero `<img>` markup edits.

- [ ] **Step 1: Generate the anchor** (hero) with Higgsfield nano_banana_pro. Prompt skeleton (de-AI recipe): real-camera language ("shot on full-frame, 35mm, f/2.8, ISO 800, subtle grain, slight motion softness, imperfect symmetry"), Elite exposure family ("warm candlelit amber, terracotta and cream tones, low tungsten glow"), JM subject ("private massage therapy room, warm oil bottles, draped massage table, dim sconces, downtown Salt Lake studio"; no people's faces, no text). Landscape 2752×1536-class. Download `_min.webp`, resize/encode to exact 2752×1536 webp.
- [ ] **Step 2: Seed the set from the anchor** (one anchor for same-room continuity; fresh generation per camera angle, same room, no duplicate frames): 4 session scenes matching current captions (room ready / warm oil pour / hands pressure on back / client exhale face-down), 3 portrait service cards (body massage table / head+scalp detail / foot reflexology), couples suite two tables, towel detail. Portrait 9:16 cuts for hero + 4 sessions are their own generations (portrait camera, not crops).
- [ ] **Step 3: Encode + drop in** at exact current dimensions/filenames (webp, quality tuned so file sizes stay within ~2× of current). `git status` shows only modified binaries.
- [ ] **Step 4: og-image** — export hero-derived 1200×630 as `og-image-v5.jpg`; sweep `og-image-v4.jpg → og-image-v5.jpg` across all pages (`grep -rln "og-image-v4" | wc -l` = 28 before, 0 after; keep the old file until ship confirmed).
- [ ] **Step 5: Verify + commit.** Local preview: index desktop + 375px — no layout shift (dimensions identical), portrait sources swap on mobile, imagery reads as one room, "$10k designer" bar (retake any shot with AI tells: warped hands, melted text, impossible reflections). `git add -A && git commit -m "Regenerate editorial imagery in Elite exposure family"`.

### Task 4: Ambient video regeneration

**Files:**
- Replace: `videos/hero-ambient.mp4`, `videos/hero-ambient-portrait.mp4`, `videos/cta-afterglow.mp4`, `videos/cta-afterglow-portrait.mp4`, `videos/couples-ambient.mp4`
- Create: `videos/couples-ambient-portrait.mp4`; Modify: `index.html:299` (add `data-src-portrait`)

**Interfaces:** Consumes Task 3 stills as first frames. Motion layer contract: `data-src`/`data-src-portrait`, `preload="none"`, no `src` attribute.

- [ ] **Step 1: Image-to-video** via Higgsfield (`models_explore action:'recommend'` for current i2v model; generate_audio/audio off): 5–8s seamless-loop ambient drift from each still — hero (landscape + portrait from the portrait still), cta-afterglow from `session-exhale` (+portrait), couples from `service-couples` (+ a portrait generation). Subtle motion only: candle flicker, steam, light drift; no people movement.
- [ ] **Step 2: Encode** H.264 mp4, muted, ≤2.5 MB each (match current budget), exact current filenames; add `data-src-portrait="/videos/couples-ambient-portrait.mp4"` at `index.html:299`.
- [ ] **Step 3: Fallback gate** — if any clip loops badly or shows AI artifacts, remove that element's `data-src`/`data-src-portrait` attrs instead (motion layer degrades to the still cleanly). Never ship a bad loop.
- [ ] **Step 4: Verify + commit.** Local preview desktop + 375px: crossfade fires, loop seam invisible, still↔video same room/grade. `git add -A && git commit -m "Regenerate ambient video loops from new stills"`.

### Task 5: Imagery wave 2 (service pages)

**Files:**
- Replace: `images/services/{swedish,deep-tissue,shiatsu,myofascial,prenatal,reflexology}-1/-2.webp`, `{sports,ashiatsu,couples,4hand,head}-2.webp` (17 files, exact current names/dimensions)

**Interfaces:** Consumes Task 3 anchor as seed. Neighborhood pages reuse deep-tissue pair automatically.

- [ ] **Step 1: Generate 17 shots** seeded from the anchor, one room family, per-modality subject (deep-tissue forearm pressure, prenatal side-lying with bolster, reflexology foot work, couples two tables, ashiatsu overhead bars, etc.). Prenatal: side-lying, clearly pregnancy-safe positioning, no face. Fresh generation per shot.
- [ ] **Step 2: Encode + drop in** at exact filenames/dimensions.
- [ ] **Step 3: Verify + commit.** Spot-check 3 service pages + 1 neighborhood page in preview at both widths. `git add -A && git commit -m "Regenerate service-page imagery in Elite exposure family"`.

### Task 6: Copy register pass

**Files:**
- Modify: `index.html`, `about.html`, `pricing.html`, `reviews.html`, `contact.html`, `faq.html`, `gift-cards.html`, `massage-salt-lake-city.html`, `massage-in-{downtown-slc,sugar-house,the-avenues,millcreek}.html`, `services/*.html` (shared labels only)

**Interfaces:** Consumes global voice constraints. Pull-quote at `index.html:163` must stay ONE text node (motion.js word-splits it).

- [ ] **Step 1: index.html full pass.** Hero eyebrow → `Salt Lake City · Open daily 10am–10pm`. H1 lines → `Come in wound tight.` / `Leave loose.` (keep the two `.line > .line-inner` spans). Subhead → `Salt Lake City's most-reviewed massage studio. Deep tissue to Ashiatsu, Utah-licensed therapists, open every day until 10pm.` CTAs → `Book Now` / `Call (801) 288-1118`. Session captions keep (already on register). Services sub: drop "Fourteen modalities" → `From Swedish to Ashiatsu, organized into three families. Pick what your body needs, or call and we will help you choose.` Sweep every remaining headline to sentence case with terminal periods; keep `<em>` accent spans (now terracotta, not italic). Footer blurb: drop the modality numeral.
- [ ] **Step 2: about.html.** Fix pull-quote attribution (leading comma / missing name → `The J Massage team, est. 2017`). Retitle title-case H2s to sentence case (`Built in downtown. Built to last.` · `Therapeutic results, not a fluffy spa.` pattern). Keep stats band numbers.
- [ ] **Step 3: Secondary pages.** pricing/reviews/contact/faq/gift-cards heroes + H2s → sentence case, terminal periods, no numeral modality claims. gift-cards: `six massage modalities` → `any massage on our menu`. massage-salt-lake-city: fix stray space before comma (`:567`), `Six Elite Modalities` H2 → `One studio. Every modality you need.` Neighborhood heroes: register pass only.
- [ ] **Step 4: services shared labels** — sweep the shared strings (`Simple, Honest Rates` → `Simple, honest rates.` etc.) via grep-guided edits across the 11 pages; unique body copy untouched. Blog untouched.
- [ ] **Step 5: Verify + commit.** `grep -rn "!" *.html services/*.html | grep -v "<!\|!=\|!important\|DOCTYPE"` → no new exclamation copy; `grep -rn "Fourteen\|fourteen modalities\|Six Elite\|six massage modalities" *.html` → empty; emoji scan `grep -rPn "[\x{1F300}-\x{1FAFF}\x{2B50}]" *.html` → empty. Read-through of index + about for voice. `git add -A && git commit -m "Rewrite copy to Elite register"`.

### Task 7: Full verification pass

- [ ] **Step 1: Harness.** `node ~/projects/exclusiveut/tools/verify-jmassage.mjs` → passes (run from a local server if it expects one; fix regressions before proceeding).
- [ ] **Step 2: Preview screenshots** — local server, shoot: index (desktop + 375px), pricing, about, one service page, one neighborhood page, gift-cards. Check: colorway coherent on every page (no page left clay-on-old-values), fonts loading, video crossfades, mobile full cinematic tier.
- [ ] **Step 3: Gates.** Encoding scan (zero `Â`/`â€`), ★ count = 78, `oklch(` = 0, `?v=` all 22/6, `fontshare|Switzer|Fraunces` = 0, og-image-v5 everywhere.
- [ ] **Step 4: Commit any fixes**, write summary for Andrew with screenshots. STOP — `/ship` and `/ultrareview` only on Andrew's explicit go.
