#!/usr/bin/env python3
"""One-shot font migration: Fraunces/Switzer -> Marcellus/PT Serif/DM Sans.

2026-08-26 Elite-look redesign. Per page: drops Fontshare (link + preconnect),
rewrites every fonts.googleapis.com/css2 URL to the Elite trio, and updates
inline font-family fallback strings. Idempotent.

Usage: python tools/refont.py [--check]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NEW_URL = ("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600"
           "&family=Marcellus&family=PT+Serif:ital,wght@0,400;0,700;1,400"
           "&display=swap")

CSS2_RX = re.compile(r"https://fonts\.googleapis\.com/css2\?[^\"']+")

SUBS = [
    ("'Switzer', 'Helvetica Neue', Arial, sans-serif", "'PT Serif', Georgia, serif"),
    ("'Switzer', sans-serif", "'PT Serif', serif"),
    ("'Fraunces', serif", "'Marcellus', serif"),
    ("'Switzer'", "'PT Serif'"),
    ("'Fraunces'", "'Marcellus'"),
]


def process(text):
    lines = text.split("\n")
    kept = [ln for ln in lines if "api.fontshare.com" not in ln]
    text = "\n".join(kept)
    text = CSS2_RX.sub(NEW_URL, text)
    for old, new in SUBS:
        text = text.replace(old, new)
    return text, len(lines) - len(kept)


def main():
    check = "--check" in sys.argv
    targets = (
        list(ROOT.glob("*.html"))
        + list((ROOT / "services").glob("*.html"))
        + list((ROOT / "blog").glob("*.html"))
    )
    for path in sorted(targets):
        text = path.read_text(encoding="utf-8", newline="")
        new, dropped = process(text)
        if new != text:
            print(f"{path.relative_to(ROOT)}: fontshare lines dropped {dropped}")
            if not check:
                path.write_text(new, encoding="utf-8", newline="")
    print("check complete" if check else "applied")


if __name__ == "__main__":
    main()
