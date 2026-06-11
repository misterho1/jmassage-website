# jmassage Visual Elevation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make jmassageslc.com visibly different standing still — bigger section type, two warm-dark contrast bands, featured Body-massage hierarchy — without touching copy, schema, or the motion layer's behavior.

**Architecture:** Pure CSS token + rule additions in `css/styles.css`, plus class/attribute-only edits in `index.html`. The existing GSAP layer (`js/motion.js`) picks up one new `data-parallax` attribute automatically. No new files, no JS changes.

**Tech Stack:** Hand-authored CSS (OKLCH tokens), GSAP 3.13 layer already shipped, python one-liners for verification greps, puppeteer-core harness for visual/behavioral checks.

**Spec:** `docs/superpowers/specs/2026-06-10-jmassage-visual-elevation-design.md`

**Hard rules:** copy byte-identical (classes/attributes only in HTML); UTF-8 + ★ U+2605; schema/canonical/GA4 untouched; no bounce easing; work on `visual-elevation`, merge only after verification.

---

### Task 1: Tokens + section type scale (`css/styles.css`)

- [ ] **Step 1:** Read `:root` block; append after existing tokens:

```css
  /* Visual elevation (2026-06) */
  --type-section: clamp(3rem, 6.5vw, 5.8rem);
  --pool-warm: oklch(20% 0.015 60);
```

- [ ] **Step 2:** Find the section-heading rule (`.ed-section-head h2`, ~line 162, currently `clamp(2.6rem, 5.5vw, 4.6rem)`). Change to:

```css
  font-size: var(--type-section);
  line-height: 1.02;
  letter-spacing: -0.01em;
```

- [ ] **Step 3:** Grep for the other editorial section headings (`.ed-pair__content h2`, `.ed-process` heading class, about-section heading class — confirm real names with `grep -n "h2" css/styles.css`). Apply `font-size: var(--type-section)` to each (do NOT touch hero, service-page.css, or footer headings).

- [ ] **Step 4:** Serve repo on :8732, headless-check homepage h2 computed sizes ≥48px at 1440w, no layout overflow (`document.documentElement.scrollWidth <= innerWidth`).

- [ ] **Step 5:** Commit: `git commit -am "feat: section display type scale — --type-section token on editorial headings"`

### Task 2: Warm-dark bands (`css/styles.css` + `index.html`)

- [ ] **Step 1:** Determine DOM section order in `index.html` (`grep -n '<section' index.html`). Existing dark: `.ed-hero`, `.ed-quote`. Apply rule: dark the **process** section and the **final CTA** section, UNLESS process is DOM-adjacent to quote — then dark **pair** instead of process.

- [ ] **Step 2:** Add band CSS (append to styles.css; selector list per Step 1 outcome):

```css
/* Warm-dark contrast bands (2026-06) */
.band-warm {
  background: var(--pool-warm);
  color: var(--timber);
}
.band-warm h2, .band-warm h3 { color: var(--timber); }
.band-warm p { color: oklch(97% 0.005 85 / 0.82); }
.band-warm .eyebrow, .band-warm .ed-eyebrow { color: var(--glow); }
.band-warm .ed-process__num { color: var(--glow); }
.band-warm [class*="__rule"], .band-warm hr { border-color: oklch(97% 0.005 85 / 0.16); }
```

(Adjust `.ed-process__num`/eyebrow class names to the real ones in the file.)

- [ ] **Step 3:** `index.html`: add `band-warm` class to the two chosen sections. Class attribute edits only.

- [ ] **Step 4:** Buttons inside banded sections: verify computed contrast of every text/bg pair ≥4.5:1 (headless `getComputedStyle` dump, compute ratios in node — no eyeballing). Fix with timber/glow swaps if any pair fails.

- [ ] **Step 5:** Headless screenshot of both bands; confirm no adjacent-dark collision with hero/quote.

- [ ] **Step 6:** Commit: `git commit -am "feat: warm-dark contrast bands (process + final CTA) with AA-verified on-dark palette"`

### Task 3: Featured Body-massage grid (`css/styles.css` + `index.html`)

- [ ] **Step 1:** `index.html`: first `.ed-svc` article (Body massage / swedish-massage link) gets class `ed-svc--featured`; its `.ed-svc__media` (or the `<img>` wrapper) gets `data-parallax="0.05"`. No text/href changes.

- [ ] **Step 2:** Grid CSS (append):

```css
/* Featured service hierarchy (2026-06) */
@media (min-width: 820px) {
  .ed-services__grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-3, 2rem);
    align-items: stretch;
  }
  .ed-svc--featured { grid-column: span 7; }
  .ed-svc:not(.ed-svc--featured) { grid-column: span 5; }
  .ed-svc--featured .ed-svc__media { min-height: 480px; }
  .ed-svc--featured .ed-svc__title { font-size: clamp(2rem, 2.6vw, 2.8rem); }
  .ed-svc:not(.ed-svc--featured) .ed-svc__media { min-height: 200px; }
}
```

NOTE: current grid is likely `grid-template-columns: repeat(3, 1fr)` — find and override/replace within the same breakpoint so two supporting cards stack in the 5-col track: wrap them or use `grid-template-areas`. Preferred concrete layout: featured spans rows 1-2 of a 2-row grid (`grid-row: span 2`), supporting cards each take one row in the right column. Implement with:

```css
  .ed-svc--featured { grid-column: 1 / 8; grid-row: 1 / 3; }
  .ed-svc:not(.ed-svc--featured) { grid-column: 8 / 13; }
```

- [ ] **Step 3:** Mobile check (<820px): grid falls back to existing single-column flow; featured card first (it already is, DOM order 1).

- [ ] **Step 4:** Headless screenshots 375/1280 of services grid; verify featured dominance, no image distortion (`object-fit: cover` present on media imgs — confirm), supporting cards balanced.

- [ ] **Step 5:** Commit: `git commit -am "feat: featured Body-massage hierarchy in services grid + media parallax"`

### Task 4: Verification suite

- [ ] **Step 1:** Run existing harness: `cd ~/jmassage-website && python -m http.server 8732 &` then `node ../projects/exclusiveut/tools/verify-jmassage.mjs` with `VERIFY_BASE=http://localhost:8732`. Expected: all PASS (motion behavior unchanged).
- [ ] **Step 2:** Diff safety greps — all must output 0:

```bash
git diff main -- . ':!docs' | grep -c 'ld+json\|canonical\|G-HR9MP6ENEP'
python -c "  # visible-text identity vs main
import subprocess, re
old = subprocess.run(['git','show','main:index.html'],capture_output=True,text=True).stdout
new = open('index.html',encoding='utf-8').read()
strip = lambda s: ' '.join(re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>','',s,flags=re.S)).split())
print('COPY OK' if strip(old)==strip(new) else 'COPY DRIFT')"
```

- [ ] **Step 3:** `file index.html css/styles.css` → UTF-8/ASCII only. ★ check: `grep -c '★' index.html` unchanged vs main.
- [ ] **Step 4:** Lighthouse homepage ≥90 ×4 (or headless perf sanity if lighthouse unavailable: hero LCP preload intact, no layout shift from grid change).
- [ ] **Step 5:** Screenshot judgment pass at 375/768/1280 — hero, grid, both bands, CTA. Fix anything that reads wrong; re-run harness after fixes.
- [ ] **Step 6:** Commit any fixes.

### Task 5: Ship

- [ ] **Step 1:** `git checkout main && git merge --no-ff visual-elevation -m "Visual elevation: section display type, warm-dark bands, featured body massage" && git push origin main && git push origin visual-elevation`
- [ ] **Step 2:** Wait for Pages deploy; curl live: new tokens present in styles.css, band class in HTML, 200s.
- [ ] **Step 3:** Update memory `project_spa_sites_50k_elevation.md` with the pass + any lessons.
