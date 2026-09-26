#!/usr/bin/env python3
"""Idempotent tracking injector for jmassageslc.com.

Ensures every page carries:
  1) the canonical GA4 + Google Ads tag (G-W8JB6XPYH9 / AW-18046916928)
  2) the Google Ads config line, on pages that already load GA4
  3) the site-wide event tracker (/js/tracking.js)

Safe to run repeatedly: a file is only changed if it is missing a piece.
Google Search Console verification files (google<hex>.html) are never touched.
Run from the repo root:  python tools/inject-tracking.py
Add --apply to write changes; default is a dry-run that only reports.
"""
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

# The GA4 config call alone on its line, capturing its indent; the Ads line goes right under it.
GA_CONFIG_LINE = re.compile(
    r"^([ \t]*)gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + re.escape(GA_ID) + r"['\"][ \t]*\)[ \t]*;?[ \t]*$", re.MULTILINE)
AW_CONFIG = re.compile(r"gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + re.escape(AW_ID) + r"['\"]")
# Any other page's gtag loader or config call, meaning a tag this tool didn't add.
OTHER_GTAG = re.compile(r"googletagmanager\.com/gtag/js|gtag\(\s*['\"]config['\"]\s*,")


def iter_html(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            if name.endswith(".html") and not VERIFICATION_FILE.fullmatch(name):
                yield os.path.join(dirpath, name)


def process(path, apply):
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()
    original = html
    actions = []

    # 1) GA4 + Ads tag
    if GA_ID not in html:
        if OTHER_GTAG.search(html):
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
    if GA_ID in html and not AW_CONFIG.search(html):
        m = GA_CONFIG_LINE.search(html)
        if m:
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
    for path in sorted(iter_html(root)):
        actions = process(path, apply)
        if actions:
            changed += 1
            print(f"{'WROTE' if apply else 'WOULD'} {path}: {', '.join(actions)}")
    mode = "applied" if apply else "dry-run (use --apply to write)"
    print(f"\n{changed} file(s) need changes — {mode}.")


if __name__ == "__main__":
    main()
