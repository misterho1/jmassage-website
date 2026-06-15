"""Normalize internal links to the canonical extensionless URLs.

Fixes GSC "Duplicate, Google chose different canonical than user": every page linked
/book.html and every service page linked siblings as ./<slug>.html — all 308-redirect to
the clean canonical, so Google discovered/held the .html form and flagged it as a duplicate
of the canonical. Point links straight at the canonical instead. Idempotent; only touches
link hrefs.

Run from anywhere:  python tools/canonical-links.py [--check]
"""
import sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SLUGS = [
    "swedish-massage", "deep-tissue", "sports-massage", "ashiatsu", "couples-massage",
    "4-hand-massage", "shiatsu", "reflexology", "prenatal", "thai-massage",
    "myofascial", "foot-massage-head-spa",
]

# (old, new) — link hrefs only, so nothing else in the markup is affected.
REPLACEMENTS = [('href="/book.html"', 'href="/book"')]
for s in SLUGS:
    REPLACEMENTS.append((f'href="./{s}.html"', f'href="/services/{s}"'))
    REPLACEMENTS.append((f'href="/services/{s}.html"', f'href="/services/{s}"'))  # defensive


def main(check):
    total = 0
    files = 0
    for p in sorted(ROOT.rglob("*.html")):
        if "node_modules" in p.parts:
            continue
        text = p.read_text(encoding="utf-8")
        n = 0
        for old, new in REPLACEMENTS:
            c = text.count(old)
            if c:
                text = text.replace(old, new)
                n += c
        if n:
            files += 1
            total += n
            if not check:
                p.write_text(text, encoding="utf-8", newline="\n")
            print(f"  {p.relative_to(ROOT)}: {n}")
    print(f"{'WOULD CHANGE' if check else 'CHANGED'} {total} links across {files} files")


if __name__ == "__main__":
    main("--check" in sys.argv)
