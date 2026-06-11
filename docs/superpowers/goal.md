# Goal — jmassage Visual Elevation (2026-06-10)

## Goal
jmassageslc.com looks visibly different standing still: section headings at display scale, two warm-dark contrast bands, Body massage visually dominant in the services grid.

## Success criteria
- Section headings render ≥48px at 1440w via `--type-section`; hero unchanged.
- Process strip + final CTA (or pair, per adjacency rule) on `--pool-warm` with AA-verified on-dark text; no two adjacent dark bands.
- Body massage card spans 7/12 columns with 480px media + parallax; supporting cards stack right; mobile stacks featured-first.
- verify-jmassage.mjs green; copy/schema/GA4 byte-identical vs main; UTF-8 + ★ intact; Lighthouse ≥90.
- Merged, deployed, live-verified.

## Non-goals
Service-page type parity; new photos; copy; nav/footer redesign.

## Constraints
Branch `visual-elevation`; main auto-deploys. CSS+class edits only; js/motion.js behavior unchanged. No bounce. Spec/plan in docs/superpowers/.
