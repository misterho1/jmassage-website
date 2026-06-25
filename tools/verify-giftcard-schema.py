#!/usr/bin/env python3
"""Verify gift-cards.html JSON-LD after de-Product change.

PASS conditions:
  - every <script type="application/ld+json"> block parses as JSON
  - NO node anywhere uses @type "Product"
  - the first block is @type "LocalBusiness" and has a "makesOffer" Offer
  - a "FAQPage" block is still present
Exit 0 on PASS, 1 on FAIL.
"""
import json
import re
import sys
import pathlib

HTML = pathlib.Path(__file__).resolve().parent.parent / "gift-cards.html"

LD_RE = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.S | re.I,
)


def collect_types(node, acc):
    """Recursively gather every @type string in the JSON-LD tree."""
    if isinstance(node, dict):
        t = node.get("@type")
        if isinstance(t, str):
            acc.add(t)
        elif isinstance(t, list):
            acc.update(x for x in t if isinstance(x, str))
        for v in node.values():
            collect_types(v, acc)
    elif isinstance(node, list):
        for v in node:
            collect_types(v, acc)
    return acc


def main():
    text = HTML.read_text(encoding="utf-8")
    raw = LD_RE.findall(text)
    if not raw:
        print("FAIL: no application/ld+json blocks found")
        return 1

    parsed = []
    for i, body in enumerate(raw):
        try:
            parsed.append(json.loads(body))
        except json.JSONDecodeError as e:
            print(f"FAIL: block {i} is invalid JSON: {e}")
            return 1

    all_types = set()
    for b in parsed:
        collect_types(b, all_types)

    if "Product" in all_types:
        print("FAIL: a node still uses @type 'Product'")
        return 1

    b0 = parsed[0]
    if b0.get("@type") != "LocalBusiness":
        print(f"FAIL: block 0 @type is {b0.get('@type')!r}, expected 'LocalBusiness'")
        return 1
    offer = b0.get("makesOffer")
    if not isinstance(offer, dict) or offer.get("@type") != "Offer":
        print("FAIL: block 0 missing a makesOffer Offer")
        return 1

    if "FAQPage" not in all_types:
        print("FAIL: FAQPage block missing")
        return 1

    print(
        f"PASS: {len(parsed)} valid ld+json block(s); no Product; "
        f"block 0 LocalBusiness+makesOffer; FAQPage intact"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
