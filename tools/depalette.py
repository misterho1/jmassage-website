#!/usr/bin/env python3
"""One-shot palette migration: oklch literals -> Elite-family hex/rgba.

2026-08-26 Elite-look redesign. Maps every oklch() literal in CSS/HTML to the
new palette (cream ramp / ink / terracotta), preserving each literal's alpha.
Idempotent: reruns find zero oklch literals and change nothing.

Usage: python tools/depalette.py [--check]
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# New palette bases (r, g, b)
TERRA = (160, 77, 44)     # #a04d2c
TERRA_DEEP = (125, 61, 35)  # #7d3d23
TERRA_LIGHT = (201, 128, 90)  # #c9805a
INK_DEEP = (31, 26, 22)   # #1f1a16
INK = (42, 38, 34)        # #2a2622
INK_MUTED = (91, 84, 76)  # #5b544c
INK_DIM = (107, 99, 88)   # #6b6358
CREAM_DEEP = (235, 226, 210)  # #ebe2d2
CREAM_SOFT = (245, 240, 232)  # #f5f0e8
CREAM = (250, 247, 243)   # #faf7f3

HEX = {
    TERRA: "#a04d2c", TERRA_DEEP: "#7d3d23", TERRA_LIGHT: "#c9805a",
    INK_DEEP: "#1f1a16", INK: "#2a2622", INK_MUTED: "#5b544c",
    INK_DIM: "#6b6358", CREAM_DEEP: "#ebe2d2", CREAM_SOFT: "#f5f0e8",
    CREAM: "#faf7f3",
}

RX = re.compile(r"oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+))?\s*\)")


def base_for(L, C, H):
    if C >= 0.05:  # accent chroma -> terracotta family
        if L <= 44:
            return TERRA_DEEP
        if L <= 50:
            return TERRA
        return TERRA_LIGHT
    if L <= 23:
        return INK_DEEP
    if L <= 33:
        return INK
    if L <= 40:
        return INK_MUTED
    if L <= 80:
        return INK_DIM
    if L <= 89:
        return CREAM_DEEP
    if L <= 93:
        return CREAM_DEEP if C >= 0.010 else CREAM_SOFT
    if L <= 95.5:
        return CREAM_SOFT
    return CREAM


def convert(m):
    L, C, H = float(m.group(1)), float(m.group(2)), float(m.group(3))
    alpha = m.group(4)
    r, g, b = base_for(L, C, H)
    if alpha is None:
        return HEX[(r, g, b)]
    return f"rgba({r}, {g}, {b}, {alpha})"


def main():
    check = "--check" in sys.argv
    targets = (
        list((ROOT / "css").glob("*.css"))
        + list(ROOT.glob("*.html"))
        + list((ROOT / "services").glob("*.html"))
        + list((ROOT / "blog").glob("*.html"))
    )
    total = 0
    for path in sorted(targets):
        text = path.read_text(encoding="utf-8", newline="")
        new, n = RX.subn(convert, text)
        if n:
            total += n
            print(f"{path.relative_to(ROOT)}: {n}")
            if not check:
                path.write_text(new, encoding="utf-8", newline="")
    print(f"{'would replace' if check else 'replaced'} {total} literals")


if __name__ == "__main__":
    main()
