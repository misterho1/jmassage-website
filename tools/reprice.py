"""Guarded J Massage price restructure (2026-06-13).

Per-file list of (old, new, expected_count) replacements. Each `old` is asserted
to occur exactly `expected_count` times in the file before any replacement is made;
on mismatch the run aborts so a changed page can never be silently corrupted.
Idempotent: re-running after a successful apply makes 0 changes (the old strings
are gone, so every count is 0 and the asserts at 0==0 pass for the post-state...
NB: because asserts require the pre-state counts, re-running after apply WILL
fail the asserts — that is intentional; run --check only against the pre-edit tree).

Run `python tools/reprice.py --check` first (no writes). Fix any count mismatch by
reading the file and correcting the tuple — never loosen the assert.

Price contract:
  Standard (swedish, deep-tissue, sports, ashiatsu, shiatsu, thai, myofascial,
            prenatal): 60=$85 / 90=$125 / 120=$165, 30-min tier dropped.
  Premium  (couples, 4-hand): 60=$165 / 90=$245 / 120=$325.
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# New 3-card grid bodies (60/90/120) for the two-/three-card "span" layout
# (swedish, deep-tissue, shiatsu, thai, myofascial, prenatal). Indented 10 spaces
# to match the existing markup inside <div class="svc-pricing__grid">.
def std_grid(d60, d90, d120):
    return (
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">60 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$85</span></div>\n'
        f'            <p class="price-card__desc">{d60}</p>\n'
        '            <a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card price-card--featured reveal-card">\n'
        '            <div class="price-card__badge">Most Popular</div>\n'
        '            <div class="price-card__duration">90 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$125</span></div>\n'
        f'            <p class="price-card__desc">{d90}</p>\n'
        '            <a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">120 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$165</span></div>\n'
        f'            <p class="price-card__desc">{d120}</p>\n'
        '            <a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
    )


REPLACEMENTS = {}

# ---------------------------------------------------------------- swedish-massage
REPLACEMENTS["services/swedish-massage.html"] = [
    ("From $55 / 30 min", "From $85 / 60 min", 1),     # hero pill (do FIRST, before bare From $55)
    ("From $55", "From $85", 4),                       # title, og-title, og-desc, twitter (capital)
    ("from $55", "from $85", 1),                       # meta description (lowercase)
    ('<span class="svc-abstract__amount">$55</span>', '<span class="svc-abstract__amount">$85</span>', 1),
    ("60 minutes from $90", "60 minutes from $85", 1),  # body copy (lowercase from $90)
    ('"price": "55"', '"price": "85"', 1),             # schema offer 30 -> 60-min price
    ('"price": "90"', '"price": "125"', 1),            # schema offer 60 -> 90-min price
    ('"price": "130"', '"price": "165"', 1),           # schema offer 90 -> 120-min price
    ('Swedish Massage 90 Min', 'Swedish Massage 120 Min', 1),  # rename top-down to avoid collision
    ('Swedish Massage 60 Min', 'Swedish Massage 90 Min', 1),
    ('Swedish Massage 30 Min', 'Swedish Massage 60 Min', 1),
    # price-card grid (replace whole inner block: old 30/60/90 -> new 60/90/120)
    (
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">30 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$55</span></div>\n'
        '            <p class="price-card__desc">Perfect for a targeted reset, shoulders, back, or a focused area of tension. Ideal when time is limited but relief is essential.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card price-card--featured reveal-card">\n'
        '            <div class="price-card__badge">Most Popular</div>\n'
        '            <div class="price-card__duration">60 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$90</span></div>\n'
        '            <p class="price-card__desc">The full-body experience. Your therapist has the time to work through every major muscle group with the depth and rhythm the session deserves.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">90 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$130</span></div>\n'
        '            <p class="price-card__desc">The complete immersion. Additional time allows for extended focus on chronic areas, a deeper relaxation arc, and a recovery period that leaves you renewed.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n',
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">60 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$85</span></div>\n'
        '            <p class="price-card__desc">The full-body experience, shoulders to feet. Your therapist has time to work through every major muscle group at an unhurried pace.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card price-card--featured reveal-card">\n'
        '            <div class="price-card__badge">Most Popular</div>\n'
        '            <div class="price-card__duration">90 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$125</span></div>\n'
        '            <p class="price-card__desc">The complete immersion. Extended focus on chronic areas, a deeper relaxation arc, and a recovery period that leaves you renewed.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">120 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$165</span></div>\n'
        '            <p class="price-card__desc">The full two hours. Whole-body work with time to revisit the areas that need it most and finish with proper integration.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n',
        1,
    ),
]

# ---------------------------------------------------------------- deep-tissue
REPLACEMENTS["services/deep-tissue.html"] = [
    ("From $55 / 30 min", "From $85 / 60 min", 1),
    ("From $55", "From $85", 3),                        # title, og-title, og-desc (capital)
    ("from $55", "from $85", 2),                        # meta + twitter (lowercase)
    ('<span class="svc-abstract__amount">$55</span>', '<span class="svc-abstract__amount">$85</span>', 1),
    ('"price": "55"', '"price": "85"', 1),
    ('"price": "90"', '"price": "125"', 1),
    ('"price": "130"', '"price": "165"', 1),
    ('Deep Tissue Massage 90 Min', 'Deep Tissue Massage 120 Min', 1),
    ('Deep Tissue Massage 60 Min', 'Deep Tissue Massage 90 Min', 1),
    ('Deep Tissue Massage 30 Min', 'Deep Tissue Massage 60 Min', 1),
    (
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">30 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$55</span></div>\n'
        '            <p class="price-card__desc">Laser-focused work on a single problem area, a stubborn neck, a locked shoulder, a compressed lumbar. Maximum impact in minimum time.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card price-card--featured reveal-card">\n'
        '            <div class="price-card__badge">Most Popular</div>\n'
        '            <div class="price-card__duration">60 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$90</span></div>\n'
        '            <p class="price-card__desc">The complete treatment. Time to assess, map, and work through the primary tension zones with the depth and deliberateness deep tissue demands.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">90 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$130</span></div>\n'
        '            <p class="price-card__desc">For complex, full-body tension patterns. Your therapist has the time to address multiple problem areas thoroughly and close with proper integration work.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n',
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">60 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$85</span></div>\n'
        '            <p class="price-card__desc">The complete treatment. Time to assess, map, and work through the primary tension zones with the depth deep tissue demands.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card price-card--featured reveal-card">\n'
        '            <div class="price-card__badge">Most Popular</div>\n'
        '            <div class="price-card__duration">90 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$125</span></div>\n'
        '            <p class="price-card__desc">For complex, full-body tension patterns. Time to address multiple problem areas thoroughly and close with proper integration.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">120 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$165</span></div>\n'
        '            <p class="price-card__desc">The full two hours for deep, layered work, multiple regions addressed without rushing, with time for the tissue to release.</p>\n'
        '            <a href="../#book" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n',
        1,
    ),
]

# ---------------------------------------------------------------- sports-massage
# Layout B (3 cards, relabel-in-place 30/60/90 -> 60/90/120). Hero "From $55 / 30 min".
REPLACEMENTS["services/sports-massage.html"] = [
    ("From $55 / 30 min", "From $85 / 60 min", 1),
    ("From $55", "From $85", 4),                        # title, og-title, og-desc, abstract price div
    ('"price": "55"', '"price": "85"', 1),
    ('"price": "90"', '"price": "125"', 1),
    ('"price": "130"', '"price": "165"', 1),
    ('Sports Massage 90 Min', 'Sports Massage 120 Min', 1),
    ('Sports Massage 60 Min', 'Sports Massage 90 Min', 1),
    ('Sports Massage 30 Min', 'Sports Massage 60 Min', 1),
    # price-card grid: reprice amounts + relabel labels/CTAs in place (top-down)
    ('<div class="price-card__amount">$55</div>', '<div class="price-card__amount">$85</div>', 1),
    ('<div class="price-card__amount">$90</div>', '<div class="price-card__amount">$125</div>', 1),
    ('<div class="price-card__amount">$130</div>', '<div class="price-card__amount">$165</div>', 1),
    ('<div class="price-card__label">90 Minutes</div>', '<div class="price-card__label">120 Minutes</div>', 1),
    ('<div class="price-card__label">60 Minutes</div>', '<div class="price-card__label">90 Minutes</div>', 1),
    ('<div class="price-card__label">30 Minutes</div>', '<div class="price-card__label">60 Minutes</div>', 1),
    ('>Book 90 Min</a>', '>Book 120 Min</a>', 1),
    ('>Book 60 Min</a>', '>Book 90 Min</a>', 1),
    ('>Book 30 Min</a>', '>Book 60 Min</a>', 1),
]

# ---------------------------------------------------------------- ashiatsu
# Layout B (3 cards). Title/og/twitter "From $55"; meta "From $60"; hero "From $55 / 30 min".
REPLACEMENTS["services/ashiatsu.html"] = [
    ("From $55 / 30 min", "From $85 / 60 min", 1),
    ("From $55", "From $85", 3),                        # og-title, og-desc, abstract price div
    ("From $60", "From $85", 1),                        # meta description
    ('"price": "55"', '"price": "85"', 1),
    ('"price": "90"', '"price": "125"', 1),
    ('"price": "130"', '"price": "165"', 1),
    ('Ashiatsu Massage 90 Min', 'Ashiatsu Massage 120 Min', 1),
    ('Ashiatsu Massage 60 Min', 'Ashiatsu Massage 90 Min', 1),
    ('Ashiatsu Massage 30 Min', 'Ashiatsu Massage 60 Min', 1),
    ('<div class="price-card__amount">$55</div>', '<div class="price-card__amount">$85</div>', 1),
    ('<div class="price-card__amount">$90</div>', '<div class="price-card__amount">$125</div>', 1),
    ('<div class="price-card__amount">$130</div>', '<div class="price-card__amount">$165</div>', 1),
    ('<div class="price-card__label">90 Minutes</div>', '<div class="price-card__label">120 Minutes</div>', 1),
    ('<div class="price-card__label">60 Minutes</div>', '<div class="price-card__label">90 Minutes</div>', 1),
    ('<div class="price-card__label">30 Minutes</div>', '<div class="price-card__label">60 Minutes</div>', 1),
    ('>Book 90 Min</a>', '>Book 120 Min</a>', 1),
    ('>Book 60 Min</a>', '>Book 90 Min</a>', 1),
    ('>Book 30 Min</a>', '>Book 60 Min</a>', 1),
]

# Insertion-anchored 120-min card for the 2-card "span" layout files.
def add_120_card(desc):
    return (
        '<a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '          <div class="price-card reveal-card">\n'
        '            <div class="price-card__duration">120 Min</div>\n'
        '            <div class="price-card__price"><span class="price-card__amount">$165</span></div>\n'
        f'            <p class="price-card__desc">{desc}</p>\n'
        '            <a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
        '          </div>\n'
        '\n'
        '        </div>'
    )

_GRID_CLOSE_ANCHOR = (
    '<a href="/book.html" class="btn btn--gold">Book This Session</a>\n'
    '          </div>\n'
    '\n'
    '        </div>'
)

# ---------------------------------------------------------------- shiatsu (60=$80->85, 90=$120->125, +120=$165)
REPLACEMENTS["services/shiatsu.html"] = [
    ("From $80", "From $85", 3),
    ("from $80", "from $85", 2),
    ('<span class="svc-abstract__amount">$80</span>', '<span class="svc-abstract__amount">$85</span>', 1),
    ('"price": "80"', '"price": "85"', 1),             # 60-min offer keeps its name, price -> $85
    ('"price": "120"', '"price": "125"', 1),           # 90-min offer keeps its name, price -> $125
    ('<span class="price-card__amount">$80</span>', '<span class="price-card__amount">$85</span>', 1),
    ('<span class="price-card__amount">$120</span>', '<span class="price-card__amount">$125</span>', 1),
    (_GRID_CLOSE_ANCHOR, add_120_card("The full two-hour meridian journey, unhurried holds on every blocked channel and a complete energetic reset, head to toe."), 1),
]

# ---------------------------------------------------------------- thai-massage (60=$85 keep, 90=$125 keep, +120=$165)
# Existing 60-min ($85) + 90-min ($125) offers already match the new tiers, so the
# Service schema needs no change. Only the visible grid gains a 120-min card.
REPLACEMENTS["services/thai-massage.html"] = [
    (_GRID_CLOSE_ANCHOR, add_120_card("The full two hours of assisted stretching and compression, every sen line and joint group worked without rushing. The deepest reset Thai bodywork offers."), 1),
]

# ---------------------------------------------------------------- myofascial (60=$95->85, 90=$140->125, +120=$165)
REPLACEMENTS["services/myofascial.html"] = [
    ("From $95", "From $85", 4),
    ("from $95", "from $85", 1),
    ('<span class="svc-abstract__amount">$95</span>', '<span class="svc-abstract__amount">$85</span>', 1),
    ('"price": "95"', '"price": "85"', 1),             # 60-min offer keeps its name, price -> $85
    ('"price": "140"', '"price": "125"', 1),           # 90-min offer keeps its name, price -> $125
    ('<span class="price-card__amount">$95</span>', '<span class="price-card__amount">$85</span>', 1),
    ('<span class="price-card__amount">$140</span>', '<span class="price-card__amount">$125</span>', 1),
    (_GRID_CLOSE_ANCHOR, add_120_card("The full two hours to address multiple restriction zones and follow the body's unwinding without watching the clock. Best for complex, full-body fascial work."), 1),
]

# ---------------------------------------------------------------- prenatal (60=$90->85, 90=$130->125, +120=$165)
REPLACEMENTS["services/prenatal.html"] = [
    ("From $90", "From $85", 4),
    ("from $90", "from $85", 1),
    ('<span class="svc-abstract__amount">$90</span>', '<span class="svc-abstract__amount">$85</span>', 1),
    ('"price": "90"', '"price": "85"', 1),             # 60-min offer keeps its name, price -> $85
    ('"price": "130"', '"price": "125"', 1),           # 90-min offer keeps its name, price -> $125
    ('<span class="price-card__amount">$90</span>', '<span class="price-card__amount">$85</span>', 1),
    ('<span class="price-card__amount">$130</span>', '<span class="price-card__amount">$125</span>', 1),
    (_GRID_CLOSE_ANCHOR, add_120_card("The full two-hour prenatal experience, unhurried relief for the lower back, hips, legs, and swollen ankles, with time to rest in supported positions."), 1),
]

# ---------------------------------------------------------------- couples-massage (Premium: from $160 -> $165)
REPLACEMENTS["services/couples-massage.html"] = [
    ("$160", "$165", 5),                               # title, og-desc, twitter, hero pill, abstract price-num
    ("<sup>$</sup>160", "<sup>$</sup>165", 1),          # price card
    ('"price": "160"', '"price": "165"', 1),           # schema offer
    ("From $170", "From $165", 1),                     # meta description ("$170/couple")
    ("From <em>$75</em>", "From <em>$85</em>", 1),      # related Swedish card (new from $85)
]

# ---------------------------------------------------------------- 4-hand-massage (Premium: already from $165)
# Own price already $165 everywhere; only related-service cross-link prices need updating.
REPLACEMENTS["services/4-hand-massage.html"] = [
    ("From <em>$160</em>", "From <em>$165</em>", 1),    # related Couples card (new from $165)
    ("From <em>$75</em>", "From <em>$85</em>", 1),      # related Swedish card (new from $85)
    ("From <em>$80</em>", "From <em>$85</em>", 1),      # related Deep Tissue card (new from $85)
]

if __name__ == "__main__":
    check_only = "--check" in sys.argv
    total = 0
    for rel, rules in REPLACEMENTS.items():
        p = ROOT / rel
        text = p.read_text(encoding="utf-8")
        for old, new, n in rules:
            found = text.count(old)
            assert found == n, f"{rel}: expected {n}x {old!r}, found {found}"
            text = text.replace(old, new)
            total += n
        if not check_only:
            p.write_text(text, encoding="utf-8", newline="")
    print(f"{'CHECK' if check_only else 'APPLIED'}: {total} replacements across {len(REPLACEMENTS)} files")
