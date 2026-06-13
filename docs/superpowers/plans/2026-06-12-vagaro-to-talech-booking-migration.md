# Vagaro → talech (Elavon) Booking Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every Vagaro reference from both spa sites and route booking to the talech `/shop/` link and gift-card purchase to the talech `/gift-card/` link, via branded new-tab handoffs.

**Architecture:** Static HTML sites on Cloudflare Pages. The talech booking URL lives in exactly one file per site (`book.html`, kept as an indexable handoff page); the talech gift URL lives only in gift touchpoints. All existing internal `/book` and `/gift-cards` CTAs are preserved. Repeated/near-identical edits (J Massage's 15 gift blocks, Elite's repeated CTAs) are applied by a per-repo one-shot Python migration script with `assert`-guarded replacement counts, then the script is deleted so the commit contains only site changes.

**Tech Stack:** HTML/CSS/JS, Python 3 (already used by `build_services.py`), git, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-06-12-vagaro-to-talech-booking-migration-design.md` (mirrored in both repos).

**Repos / branches:**
- `elitespautah` — branch `redesign-50k` (its live working branch; do **not** disturb the existing stash).
- `jmassage-website` — branch off `main` → `vagaro-to-talech`.

**The current Vagaro URL (identical everywhere, booking + gift):**
```
https://www.vagaro.com/Users/BusinessWidget.aspx?enc=MMLjhIwJMcwFQhXLL7ifVHKYuAKWAUhD4G0L9qRXJ5pm+kkiqAWwPdX1XsaeYmPl0JrchjPDG5qHxPdqGpuT5VUkJrVVC/V6OkhN7z9H93qNMF5h1uVTP8pXdABoEFp1t60XkKx1MoGeHQhf0qQlz1BEDE+E54KRIZAo/koOrZ9/aJa3otAborKYlGIAu40RMZCJ1JUFrvQIoF19ov9i69JaQlnxLtiK9D37/X10OsvtylybX4Eg0cJytqTP4qcrcGg0FwhJLH7GY8AfgJGFE23YrLIQPY233qBJ9Z36UnrC0Xee51D7GmpXbU7v6FKFPaaiNa6vBErJ1cqt4V+sJYW4OJAVY5fZylISm49Ax4Ao8a4oNi0xkAt9IFplsE19gwGag56mdydyvMyK4WtLCTWApc2S2egPnwtpT4AG7gi+Fn3VFUSMM1D703Ni963UIlRfEQ8HEvfF2w8buXQbAn2o3/L+Su5QtAwbECxMtx3QUal1GTXga7dwlvVpjEsqSyQqqm0Tjc2evw3uIgXWOA==
```

**The four talech URLs:**
| | J Massage | Elite Spa |
|---|---|---|
| Booking | `https://microsite.talech.com/shop/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7` | `https://microsite.talech.com/shop/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg` |
| Gift | `https://microsite.talech.com/gift-card/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7` | `https://microsite.talech.com/gift-card/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg` |

---

## Task 0: Pre-flight — fetch, branch, baseline

**Files:** none (git + read-only).

- [ ] **Step 1: Fetch both repos (local copies go stale)**

Run:
```bash
cd /c/Users/goho2/elitespautah && git fetch origin && git status -sb
cd /c/Users/goho2/jmassage-website && git fetch origin && git status -sb
```
Expected: `elitespautah` on `redesign-50k`, clean; `jmassage-website` on `main`, clean. If either is dirty, STOP and report.

- [ ] **Step 2: Create the J Massage feature branch (do not commit to default `main`)**

Run:
```bash
cd /c/Users/goho2/jmassage-website && git checkout -b vagaro-to-talech && git rev-parse --abbrev-ref HEAD
```
Expected: `vagaro-to-talech`. (Elite stays on its existing `redesign-50k` — no new branch.)

- [ ] **Step 3: Capture the baseline Vagaro footprint (the "failing" state)**

Run (each repo):
```bash
cd /c/Users/goho2/elitespautah && grep -rIino 'vagaro' . --exclude-dir=.git --exclude-dir=docs | wc -l
cd /c/Users/goho2/jmassage-website && grep -rIino 'vagaro' . --exclude-dir=.git --exclude-dir=docs | wc -l
```
Expected (non-zero): Elite ≈ 4 (`book.html` ×2, `build_services.py`, `_redirects`, `PRODUCT.md`); J Massage ≈ 24 (`book.html` ×3, `gift-cards.html` ×5, `css/styles.css` ×3, 14 service pages ×1). Record the numbers — they must hit 0 after migration.

---

## Task 1: Elite — run the migration script

**Files:**
- Create (temporary): `C:\Users\goho2\elitespautah\migrate_talech.py`
- Modify: `book.html`, `gift-cards.html`, `build_services.py`, `_redirects`, `PRODUCT.md`

- [ ] **Step 1: Create `migrate_talech.py` in the Elite repo root**

```python
#!/usr/bin/env python3
# One-shot migration: Vagaro -> talech (Elavon) for elitespautah. Run from repo root; deleted after use.
import io, re

VAGARO = "https://www.vagaro.com/Users/BusinessWidget.aspx?enc=MMLjhIwJMcwFQhXLL7ifVHKYuAKWAUhD4G0L9qRXJ5pm+kkiqAWwPdX1XsaeYmPl0JrchjPDG5qHxPdqGpuT5VUkJrVVC/V6OkhN7z9H93qNMF5h1uVTP8pXdABoEFp1t60XkKx1MoGeHQhf0qQlz1BEDE+E54KRIZAo/koOrZ9/aJa3otAborKYlGIAu40RMZCJ1JUFrvQIoF19ov9i69JaQlnxLtiK9D37/X10OsvtylybX4Eg0cJytqTP4qcrcGg0FwhJLH7GY8AfgJGFE23YrLIQPY233qBJ9Z36UnrC0Xee51D7GmpXbU7v6FKFPaaiNa6vBErJ1cqt4V+sJYW4OJAVY5fZylISm49Ax4Ao8a4oNi0xkAt9IFplsE19gwGag56mdydyvMyK4WtLCTWApc2S2egPnwtpT4AG7gi+Fn3VFUSMM1D703Ni963UIlRfEQ8HEvfF2w8buXQbAn2o3/L+Su5QtAwbECxMtx3QUal1GTXga7dwlvVpjEsqSyQqqm0Tjc2evw3uIgXWOA=="
EL_BOOK = "https://microsite.talech.com/shop/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg"
EL_GIFT = "https://microsite.talech.com/gift-card/ELITE-SPA-SALT-LAKE-CITY-UT/bXoq6Y81R7e9x7Dg"

def read(p):
    with io.open(p, encoding="utf-8") as f:
        return f.read()

def write(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)

def sub(p, old, new, expect):
    s = read(p)
    n = s.count(old)
    assert n == expect, "%s: expected %d of <<%s...>>, found %d" % (p, expect, old[:48], n)
    write(p, s.replace(old, new))
    print("  %s: %dx" % (p, n))

# --- book.html ---
# a) preconnect: vagaro -> talech
sub("book.html",
    '<link rel="preconnect" href="https://www.vagaro.com">',
    '<link rel="preconnect" href="https://microsite.talech.com">', 1)

# b) remove the now-dead inline <style> (booking-frame-wrap) block
s = read("book.html")
s2, n = re.subn(r"  <style>\n    \.booking-frame-wrap \{.*?\n  </style>\n", "", s, count=1, flags=re.DOTALL)
assert n == 1, "book.html: dead <style> block not matched (%d)" % n
write("book.html", s2)
print("  book.html: removed dead <style> block")

# c) replace the iframe wrapper with the talech handoff
OLD_DIV = (
    '      <div class="booking-frame-wrap">\n'
    '        <div class="booking-frame-wrap__skeleton" aria-hidden="true">\n'
    '          <span class="booking-frame-wrap__skeleton-eyebrow">Loading availability</span>\n'
    '          <div class="booking-frame-wrap__skeleton-bar" style="max-width: 380px;"></div>\n'
    '          <div class="booking-frame-wrap__skeleton-bar" style="max-width: 280px;"></div>\n'
    '          <div class="booking-frame-wrap__skeleton-bar" style="max-width: 340px;"></div>\n'
    '        </div>\n'
    '        <iframe\n'
    '          class="booking-frame-wrap__iframe"\n'
    '          src="' + VAGARO + '"\n'
    '          title="Book your appointment with Elite Spa Utah"\n'
    '          loading="eager"\n'
    '          width="100%"\n'
    '          height="1200"\n'
    '          frameborder="0"\n'
    '          allow="payment"\n'
    '        ></iframe>\n'
    '      </div>'
)
NEW_DIV = (
    '      <div style="max-width: 680px; margin: 0 auto; text-align: center;">\n'
    '        <p class="lead">Reserve through our secure online scheduler &mdash; pick your service, time, and therapist, and your confirmation lands in your inbox the moment you book.</p>\n'
    '        <a class="btn btn--primary" href="' + EL_BOOK + '" target="_blank" rel="noopener" data-magnetic style="margin-top: var(--space-3); font-size: var(--type-4); padding: var(--space-3) var(--space-5);">Book your appointment &rarr;</a>\n'
    '      </div>'
)
sub("book.html", OLD_DIV, NEW_DIV, 1)

# --- gift-cards.html: retarget the 6 gift-intent CTAs to talech gift (new tab). Nav "Book Now" untouched. ---
sub("gift-cards.html",
    '<a class="service-card text-center" href="/book" style="padding: var(--space-3) var(--space-2);">',
    '<a class="service-card text-center" href="' + EL_GIFT + '" target="_blank" rel="noopener" style="padding: var(--space-3) var(--space-2);">', 4)
sub("gift-cards.html",
    '<a class="btn btn--primary" href="/book">Buy a Gift Card</a>',
    '<a class="btn btn--primary" href="' + EL_GIFT + '" target="_blank" rel="noopener">Buy a Gift Card</a>', 1)
sub("gift-cards.html",
    '<a class="btn btn--primary" href="/book" data-magnetic>Buy a Gift Card</a>',
    '<a class="btn btn--primary" href="' + EL_GIFT + '" target="_blank" rel="noopener" data-magnetic>Buy a Gift Card</a>', 1)

# --- non-page references ---
sub("build_services.py", "matches the live Vagaro pricing table", "matches the live pricing table", 1)
sub("_redirects",
    "# /book is now served directly (book.html embeds the Vagaro widget as an iframe).",
    "# /book is served directly (book.html hands off to the talech online scheduler).", 1)
sub("PRODUCT.md",
    "Handing off cleanly to the embedded Vagaro booking widget at `/book`",
    "Handing off cleanly to the talech online scheduler from `/book`", 1)

print("elite migration complete.")
```

- [ ] **Step 2: Run it**

Run:
```bash
cd /c/Users/goho2/elitespautah && python migrate_talech.py
```
Expected: prints one line per edit and `elite migration complete.` with no `AssertionError`. An assertion failure means the file differs from the plan's expected text — STOP, re-read that file, fix, retry. Do not hand-edit around an assertion.

- [ ] **Step 3: Delete the script (keep the commit clean / remove its Vagaro string)**

Run:
```bash
cd /c/Users/goho2/elitespautah && rm migrate_talech.py
```

- [ ] **Step 4: Verify zero Vagaro + correct talech URLs (the "passing" state)**

Run:
```bash
cd /c/Users/goho2/elitespautah
grep -rIin 'vagaro' . --exclude-dir=.git --exclude-dir=docs ; echo "vagaro hits above (want none)"
grep -rIl 'microsite.talech.com/shop/ELITE-SPA' book.html ; echo "<- booking URL in book.html"
grep -rIc 'microsite.talech.com/gift-card/ELITE-SPA' gift-cards.html ; echo "<- gift URL count in gift-cards.html (want 6)"
```
Expected: zero vagaro hits; `book.html` listed; gift URL count `6`.

- [ ] **Step 5: Confirm Elite has no regen dependency (booking change must not alter generated pages)**

Run:
```bash
cd /c/Users/goho2/elitespautah && python build_services.py && git diff --stat -- ':!book.html' ':!gift-cards.html' ':!build_services.py' ':!_redirects' ':!PRODUCT.md'
```
Expected: empty (no generated service page changed). If non-empty, that's local template drift unrelated to this migration — run `git checkout -- <those files>` to restore and note it; the booking migration does not depend on regen.

---

## Task 2: Elite — visual spot-check + commit

- [ ] **Step 1: Serve and eyeball the two pages**

Run:
```bash
cd /c/Users/goho2/elitespautah && python -m http.server 8099
```
In a browser open `http://localhost:8099/book.html` and `http://localhost:8099/gift-cards.html`. Confirm: the booking page shows the "Book your appointment" button (no empty iframe gap); clicking it opens the Elite **/shop/** URL in a new tab; the gift page's amount cards + "Buy a Gift Card" buttons open the Elite **/gift-card/** URL in a new tab. Stop the server (Ctrl+C).

- [ ] **Step 2: Review the diff**

Run:
```bash
cd /c/Users/goho2/elitespautah && git status -sb && git --no-pager diff
```
Expected modified: `book.html`, `gift-cards.html`, `build_services.py`, `_redirects`, `PRODUCT.md` — and nothing else. Confirm no stray `migrate_talech.py`.

- [ ] **Step 3: Commit (on `redesign-50k`)**

> Per Andrew's standing rule, commit only after he okays it at the execution handoff. When cleared:
```bash
cd /c/Users/goho2/elitespautah && git add -A && git commit -m "feat: replace Vagaro booking + gift cards with talech (Elavon) link-outs

- book.html: iframe -> branded /shop/ handoff button (new tab), drop dead booking-frame-wrap CSS + vagaro preconnect
- gift-cards.html: 6 gift CTAs -> talech /gift-card/ (new tab)
- build_services.py / _redirects / PRODUCT.md: drop Vagaro wording
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: J Massage — run the migration script

**Files:**
- Create (temporary): `C:\Users\goho2\jmassage-website\migrate_talech.py`
- Modify: `book.html`, `gift-cards.html`, `services/*.html` (14), `css/styles.css`

- [ ] **Step 1: Create `migrate_talech.py` in the J Massage repo root**

```python
#!/usr/bin/env python3
# One-shot migration: Vagaro -> talech (Elavon) for jmassage-website. Run from repo root; deleted after use.
import io, glob

VAGARO = "https://www.vagaro.com/Users/BusinessWidget.aspx?enc=MMLjhIwJMcwFQhXLL7ifVHKYuAKWAUhD4G0L9qRXJ5pm+kkiqAWwPdX1XsaeYmPl0JrchjPDG5qHxPdqGpuT5VUkJrVVC/V6OkhN7z9H93qNMF5h1uVTP8pXdABoEFp1t60XkKx1MoGeHQhf0qQlz1BEDE+E54KRIZAo/koOrZ9/aJa3otAborKYlGIAu40RMZCJ1JUFrvQIoF19ov9i69JaQlnxLtiK9D37/X10OsvtylybX4Eg0cJytqTP4qcrcGg0FwhJLH7GY8AfgJGFE23YrLIQPY233qBJ9Z36UnrC0Xee51D7GmpXbU7v6FKFPaaiNa6vBErJ1cqt4V+sJYW4OJAVY5fZylISm49Ax4Ao8a4oNi0xkAt9IFplsE19gwGag56mdydyvMyK4WtLCTWApc2S2egPnwtpT4AG7gi+Fn3VFUSMM1D703Ni963UIlRfEQ8HEvfF2w8buXQbAn2o3/L+Su5QtAwbECxMtx3QUal1GTXga7dwlvVpjEsqSyQqqm0Tjc2evw3uIgXWOA=="
JM_BOOK = "https://microsite.talech.com/shop/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7"
JM_GIFT = "https://microsite.talech.com/gift-card/JMASSAGE-SALT-LAKE-CITY-UT/lRzV8wqp7la9E3Q7"

def read(p):
    with io.open(p, encoding="utf-8") as f:
        return f.read()

def write(p, s):
    with io.open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)

def sub(p, old, new, expect):
    s = read(p)
    n = s.count(old)
    assert n == expect, "%s: expected %d of <<%s...>>, found %d" % (p, expect, old[:48], n)
    write(p, s.replace(old, new))
    print("  %s: %dx" % (p, n))

# --- 1) book.html: remove Vagaro comment + iframe section, insert talech handoff ---
OLD_BOOK = (
    '    <!-- Embedded Vagaro booking widget -->\n'
    '    <section class="book-embed">\n'
    '      <div class="container book-embed__wrap">\n'
    '        <iframe\n'
    '          src="' + VAGARO + '"\n'
    '          title="J Massage SLC online booking"\n'
    '          class="book-embed__iframe"\n'
    '          loading="lazy"\n'
    '          allow="payment"\n'
    '        ></iframe>\n'
    '        <p class="book-embed__fallback">\n'
    '          Trouble loading the scheduler?\n'
    '          <a href="' + VAGARO + '" target="_blank" rel="noopener">Open scheduler in a new tab</a>\n'
    '          or call us at <a href="tel:+18012881118">(801) 288-1118</a>.\n'
    '        </p>\n'
    '      </div>\n'
    '    </section>'
)
NEW_BOOK = (
    '    <!-- Online booking handoff (talech) -->\n'
    '    <section class="book-embed">\n'
    '      <div class="container" style="max-width:680px;margin:0 auto;text-align:center;padding-block:1rem 2rem;">\n'
    '        <p style="font-size:1.05rem;line-height:1.6;margin-bottom:1.75rem;">Reserve your session through our secure online scheduler. Choose your modality, pick a time, and confirm instantly.</p>\n'
    '        <a class="btn btn--gold" href="' + JM_BOOK + '" target="_blank" rel="noopener">Book your session &rarr;</a>\n'
    '        <p class="book-embed__fallback" style="margin-top:1.75rem;">Prefer to book by phone? Call <a href="tel:+18012881118">(801) 288-1118</a> &mdash; open daily, 10am to 10pm.</p>\n'
    '      </div>\n'
    '    </section>'
)
sub("book.html", OLD_BOOK, NEW_BOOK, 1)

# --- 2 + 3) gift-cards.html + 14 service pages: retarget the static gift button (id unique) and swap the Vagaro URL (JSON-LD + JS) to talech gift ---
A_OLD = 'href="/book.html" id="giftPurchaseBtn" class="btn btn--gold btn--full"'
A_NEW = 'href="' + JM_GIFT + '" id="giftPurchaseBtn" class="btn btn--gold btn--full" target="_blank" rel="noopener"'
gift_files = ["gift-cards.html"] + sorted(glob.glob("services/*.html"))
anchors = urls = 0
for p in gift_files:
    s = read(p)
    a = s.count(A_OLD); s = s.replace(A_OLD, A_NEW); anchors += a
    u = s.count(VAGARO); s = s.replace(VAGARO, JM_GIFT); urls += u
    write(p, s)
    print("  %s: anchor %d, url %d" % (p, a, u))
assert anchors == 15, "anchor replacements: expected 15, got %d" % anchors
assert urls == 16, "url replacements: expected 16, got %d" % urls

# --- 4) neutralize visible "Vagaro" copy (gift-cards.html only) ---
sub("gift-cards.html", "Secure purchase via Vagaro", "Secure online checkout", 1)
sub("gift-cards.html", "Processed securely by Vagaro.", "Processed securely.", 1)
sub("gift-cards.html", "All payments are processed securely through Vagaro.", "All payments are processed securely.", 1)

# --- 5) neutralize "Vagaro" in CSS comments (no em-dash in the matched substrings) ---
sub("css/styles.css", "embedded Vagaro widget", "online booking handoff", 1)
sub("css/styles.css", "Vagaro's", "the scheduler's", 2)

print("jmassage migration complete.")
```

- [ ] **Step 2: Run it**

Run:
```bash
cd /c/Users/goho2/jmassage-website && python migrate_talech.py
```
Expected: per-file lines, `anchor 15` total, `url 16` total, `jmassage migration complete.`, no `AssertionError`. On any assertion failure STOP and re-read the offending file rather than hand-patching.

- [ ] **Step 3: Delete the script**

Run:
```bash
cd /c/Users/goho2/jmassage-website && rm migrate_talech.py
```

- [ ] **Step 4: Verify zero Vagaro + correct talech URLs**

Run:
```bash
cd /c/Users/goho2/jmassage-website
grep -rIin 'vagaro' . --exclude-dir=.git --exclude-dir=docs ; echo "vagaro hits above (want none)"
grep -rIc 'microsite.talech.com/shop/JMASSAGE' book.html ; echo "<- booking URL in book.html (want 1)"
grep -rIl 'microsite.talech.com/gift-card/JMASSAGE' gift-cards.html services/swedish-massage.html services/thai-massage.html ; echo "<- gift URL present in gift-cards + sampled services"
```
Expected: zero vagaro hits; booking count `1`; all three sampled files listed.

- [ ] **Step 5: Sanity-check UTF-8 (J Massage has a CP1252 history)**

Run:
```bash
cd /c/Users/goho2/jmassage-website && grep -rIl $'â' . --include='*.html' --exclude-dir=.git || echo "no mojibake markers"
```
Expected: `no mojibake markers`. (The script reads/writes `encoding="utf-8"`; this confirms no new corruption.)

---

## Task 4: J Massage — visual spot-check + commit

- [ ] **Step 1: Serve and eyeball**

Run:
```bash
cd /c/Users/goho2/jmassage-website && python -m http.server 8098
```
Open `http://localhost:8098/book.html`, `http://localhost:8098/gift-cards.html`, and one service page e.g. `http://localhost:8098/services/swedish-massage.html`. Confirm: booking page shows the "Book your session" button (no empty iframe gap) → opens JM **/shop/** in a new tab; gift page and the service-page gift button → open JM **/gift-card/** in a new tab (even without first selecting an amount). Stop the server.

- [ ] **Step 2: Review the diff**

Run:
```bash
cd /c/Users/goho2/jmassage-website && git status -sb && git --no-pager diff --stat
```
Expected modified: `book.html`, `gift-cards.html`, `css/styles.css`, and the 14 `services/*.html`. No `migrate_talech.py`.

- [ ] **Step 3: Commit (on `vagaro-to-talech`)**

> After Andrew okays committing:
```bash
cd /c/Users/goho2/jmassage-website && git add -A && git commit -m "feat: replace Vagaro booking + gift cards with talech (Elavon) link-outs

- book.html: iframe -> branded /shop/ handoff button (new tab)
- gift-cards.html + 14 service pages: gift button + JSON-LD + JS -> talech /gift-card/ (new tab, static href fixed)
- gift-cards.html: neutral processor wording; css: drop Vagaro comments
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Cross-site final verification + deploy readiness

- [ ] **Step 1: Final dual-repo grep gate**

Run:
```bash
for d in elitespautah jmassage-website; do echo "== $d =="; cd /c/Users/goho2/$d && grep -rIin 'vagaro\|BusinessWidget.aspx' . --exclude-dir=.git --exclude-dir=docs && echo "HITS (bad)" || echo "clean"; done
```
Expected: both `clean`.

- [ ] **Step 2: Assert all four talech URLs are present exactly where expected**

Run:
```bash
cd /c/Users/goho2/elitespautah && grep -RIo 'microsite.talech.com/[a-z-]*/[A-Z-]*/[A-Za-z0-9]*' book.html gift-cards.html | sort -u
cd /c/Users/goho2/jmassage-website && grep -RIo 'microsite.talech.com/[a-z-]*/[A-Z-]*/[A-Za-z0-9]*' book.html gift-cards.html services/swedish-massage.html | sort -u
```
Expected: Elite shows `.../shop/ELITE-SPA-.../bXoq6Y81R7e9x7Dg` and `.../gift-card/ELITE-SPA-.../bXoq6Y81R7e9x7Dg`; J Massage shows `.../shop/JMASSAGE-.../lRzV8wqp7la9E3Q7` and `.../gift-card/JMASSAGE-.../lRzV8wqp7la9E3Q7`.

- [ ] **Step 3: Confirm Cloudflare Pages deploy method per repo (do NOT deploy yet)**

Consult `reference_cloudflare_pages_deploys` memory. For each repo determine git-connected (push to the deploy branch auto-builds) vs Direct-Upload (`wrangler pages deploy`). Record the method. **These are live production sites — do not push or deploy without Andrew's explicit go.**

- [ ] **Step 4: Hand back to Andrew for `/ultrareview` + deploy**

Report: both repos migrated, 0 Vagaro, branches (`elitespautah@redesign-50k`, `jmassage-website@vagaro-to-talech`), commits ready (or pending his okay). Andrew runs `/ultrareview` (step 4 of his workflow), then approves deploy. After deploy, smoke-test the live `/book` and `/gift-cards` on both domains and the talech links.

---

## Notes / guardrails
- `assert`-guarded counts are the safety net: a mismatch means the local file differs from this plan — investigate, don't force.
- Scripts use `encoding="utf-8"` + `newline=""` to preserve line endings and avoid the CP1252 corruption J Massage has seen before.
- Booking model is a branded handoff: `/book` and `/gift-cards` stay real, indexable pages; JSON-LD `offers.url` (`…/book`) still resolves 200; phone fallback retained on every handoff.
- No Cloudflare `_headers` changes (no Vagaro reference; `X-Frame-Options` is irrelevant to outbound links).
- Do not disturb the Elite `redesign-50k` stash.
