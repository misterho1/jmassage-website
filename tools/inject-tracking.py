#!/usr/bin/env python3
"""Idempotent tracking injector for jmassageslc.com.

Ensures every page carries:
  1) the canonical GA4 + Google Ads tag (G-W8JB6XPYH9 / AW-18046916928)
  2) the Google Ads config line, on pages that already load GA4
  3) the site-wide event tracker (/js/tracking.js)
and that the scripts in js/ hold no other Google tag ID (STALE-ID).

Safe to run repeatedly: a file is only changed if it is missing a piece.
An Ads config that exists only inside an HTML comment is reported (COMMENTED-ADS),
never counted as configured and never re-enabled. Pages that load gtag.js through
js/after-paint.js (/book, /pricing) never get an eager loader added (LAZY-GTAG).
Google Search Console verification files (google<hex>.html) are never touched.
Run from the repo root:  python tools/inject-tracking.py
Add --apply to write changes; default is a dry-run that only reports.
Exit code 1 when a dry run lists anything, or when --apply leaves a hand fix.
"""
import glob
import os
import sys
import re

GA_ID = "G-W8JB6XPYH9"
AW_ID = "AW-18046916928"
TRACKING_SRC = "/js/tracking.js"

SNIPPET = f"""  <!-- conv-tracking GA4+Ads (managed by tools/inject-tracking.py) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', '{GA_ID}');
    gtag('config', '{AW_ID}');
  </script>
"""

TRACKING_TAG = f'  <script src="{TRACKING_SRC}" defer></script>\n'

SKIP_DIRS = {".git", "node_modules", "docs", "tools"}

# Search Console verification tokens are 16 hex characters.
VERIFICATION_FILE = re.compile(r"google[0-9a-f]{16}\.html")

COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
# The GA4 config call alone on its line, capturing its indent; the Ads line goes right under it.
GA_CONFIG_LINE = re.compile(
    r"^([ \t]*)gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + re.escape(GA_ID) + r"['\"][ \t]*\)[ \t]*;?[ \t]*$", re.MULTILINE)
AW_CONFIG = re.compile(r"gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + re.escape(AW_ID) + r"['\"]")
# Any other page's gtag loader or config call, meaning a tag this tool didn't add.
OTHER_GTAG = re.compile(r"googletagmanager\.com/gtag/js|gtag\(\s*['\"]config['\"]\s*,")
# js/after-paint.js loads gtag.js after first paint (/book, /pricing); an eager loader would undo that.
LAZY_GTAG = re.compile(r"""<script[^>]*\ssrc=["'][^"']*/js/after-paint\.js""", re.IGNORECASE)
# GA4 and Google Ads IDs as written in the scripts under js/.
TAG_ID = re.compile(r"\b(?:G-[A-Z0-9]{10}|AW-\d{9,})\b")


def live(html):
    """The page without its HTML comments."""
    return COMMENT.sub("", html)


def first_live(pattern, html):
    """The first match of pattern that is not inside an HTML comment, or None."""
    comments = [m.span() for m in COMMENT.finditer(html)]
    for m in pattern.finditer(html):
        if not any(start <= m.start() < end for start, end in comments):
            return m
    return None


def iter_html(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.endswith(".html") and not VERIFICATION_FILE.fullmatch(name):
                yield os.path.join(dirpath, name)


def stale_js_ids(root):
    """(path, id) for each Google tag ID in js/*.js that isn't GA_ID or AW_ID."""
    for path in sorted(glob.glob(os.path.join(root, "js", "*.js"))):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        for tag_id in sorted(set(TAG_ID.findall(text)) - {GA_ID, AW_ID}):
            yield path, tag_id


def process(path, apply):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    original = html
    actions = []

    # 1) GA4 + Ads tag
    if GA_ID not in html:
        if LAZY_GTAG.search(html):
            actions.append("LAZY-GTAG(skipped-tag)")
        elif OTHER_GTAG.search(html):
            actions.append("OTHER-GTAG(skipped-tag)")
        else:
            m = re.search(r"<head[^>]*>", html, re.IGNORECASE)
            if m:
                idx = m.end()
                html = html[:idx] + "\n" + SNIPPET + html[idx:]
                actions.append("added-tag")
            else:
                actions.append("NO-HEAD(skipped-tag)")

    # 2) Ads config on a page that already loads GA4
    if GA_ID in html and not AW_CONFIG.search(live(html)):
        m = first_live(GA_CONFIG_LINE, html)
        if AW_CONFIG.search(html):
            actions.append("COMMENTED-ADS(skipped-ads)")  # a person commented it out; they decide
        elif m:
            idx = m.end()
            html = html[:idx] + "\n" + m.group(1) + f"gtag('config', '{AW_ID}');" + html[idx:]
            actions.append("added-ads-config")
        else:
            actions.append("NO-GA-CONFIG(skipped-ads)")

    # 3) tracking.js
    if TRACKING_SRC not in html:
        m = re.search(r"</body>", html, re.IGNORECASE)
        if m:
            idx = m.start()
            html = html[:idx] + TRACKING_TAG + html[idx:]
            actions.append("added-tracking.js")
        else:
            actions.append("NO-BODY(skipped-tracking)")

    if html != original and apply:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

    return actions


def main():
    apply = "--apply" in sys.argv
    root = "."
    changed = 0
    by_hand = 0
    for path in sorted(iter_html(root)):
        actions = process(path, apply)
        if actions:
            changed += 1
            skipped = [a for a in actions if "(skipped-" in a]
            by_hand += bool(skipped)
            if not apply:
                verb = "WOULD"
            elif len(skipped) == len(actions):
                verb = "SKIPPED"
            else:
                verb = "WROTE"
            print(f"{verb} {path}: {', '.join(actions)}")
    stale = list(stale_js_ids(root))
    for path, tag_id in stale:
        print(f"STALE-ID {path}: {tag_id}")
    changed += len({path for path, _ in stale})
    by_hand += len({path for path, _ in stale})
    mode = "applied" if apply else "dry-run (use --apply to write)"
    print(f"\n{changed} file(s) need changes — {mode}.")
    if apply and by_hand:
        print(f"{by_hand} file(s) still need a hand fix: see the (skipped-...) and STALE-ID items above.")
    return 1 if (by_hand if apply else changed) else 0


if __name__ == "__main__":
    sys.exit(main())
