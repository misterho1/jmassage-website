# jmassage Visual Elevation — Design Spec

Date: 2026-06-10. Branch: `visual-elevation` off main `61efc7f`.
Approved by Andrew (design gate): full autonomy through merge.
Prior pass (motion layer, merged `de8f943`) is the foundation; this pass changes how the site looks standing still.

## Decisions (locked)

1. Featured service on homepage grid: **Body massage** (Andrew's pick — volume seller).
2. Dark rhythm: **contrast moments** — two warm-dark bands, not a dark shell.
3. Scope: homepage (`index.html`) + global tokens in `css/styles.css`. Service pages untouched (follow-up candidate).

## D1. Display type

- New token in `:root`: `--type-section: clamp(3rem, 6.5vw, 5.8rem)`.
- Apply to editorial section headings: `.ed-section-head h2`, `.ed-pair__content h2`, `.ed-process h2` (or actual heading classes found in file), `.ed-about h2` equivalent. Line-height ~1.02, letter-spacing -0.01em.
- Hero (9.5rem max) unchanged.

## D2. Warm-dark bands

- New token: `--pool-warm: oklch(20% 0.015 60)` (existing shadow hue family).
- Band sections get bg `--pool-warm`, body text `--timber`, headings `--timber`, eyebrows/numerals clay (`--glow`), borders/hairlines at low-alpha timber.
- Targets: **process strip** (`.ed-process`) and **final CTA section**.
- Rhythm rule: no two adjacent dark bands in DOM order (existing dark: `.ed-hero`, `.ed-quote`). If `.ed-process` is adjacent to `.ed-quote`, band `.ed-pair` instead of process.
- Buttons on dark: primary stays clay; secondary/ghost variants must keep AA contrast on `--pool-warm` (verify computed pairs ≥4.5:1).

## D3. Featured-service hierarchy (homepage services grid)

- `.ed-services__grid` → 12-col asymmetric at ≥820px: Body massage card (`.ed-svc--featured`) spans 7 cols, taller media (~480px), title one Fraunces step up, price/desc visible; foot-massage-head-spa + reflexology stack in the 5-col column (compact: smaller media, tighter type).
- Body massage card uses its existing real image; media gets `data-parallax="0.05"`.
- Mobile (<820px): single column, featured first with full-height media; supporting cards keep current compact layout.
- Markup: classes/attributes only — link hrefs, titles, descriptions, prices byte-identical.
- Couples `.ed-pair` section unchanged structurally (unless it takes the dark band per D2 rule).

## D4. Motion

- Existing `js/motion.js` reused. New wiring limited to `data-parallax` on featured media. Grid stagger (`data-reveal-stagger`) preserved. No new JS files, no new animation paths, no bounce.

## D5. Guardrails (unchanged from prior pass)

Copy byte-identical · JSON-LD/canonicals/sitemap/robots/GA4 `G-HR9MP6ENEP` untouched · UTF-8 + ★ U+2605 · `prefers-reduced-motion` + no-JS = complete static page · Lighthouse ≥90 ×4 on homepage.

## D6. Verification

1. `tools/verify-jmassage.mjs` harness (exclusiveut repo) green.
2. Fresh screenshots 375/768/1280: hero, services grid, dark bands, CTA — design judgment pass.
3. `git diff main` greps: zero hits on `ld+json`, `canonical`, `G-HR9MP6ENEP`; visible-text extraction identical.
4. `file` UTF-8 sweep on touched files.
5. Merge to main on green; live verify jmassageslc.com.

## Out of scope

Service-page type parity; new photography; copy; nav/footer redesign; elite changes.
