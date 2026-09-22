"""Add the missing BreadcrumbList blocks (2026-09 GSC audit, row R-11).

Every /services/* page already emits BreadcrumbList; the non-service templates never
got it. This adds the same block to the nine indexed pages that lack it: /pricing,
/faq, /contact, /gift-cards, /reviews and the four /massage-in-* neighbourhood pages.
The neighbourhood trails run Home > Salt Lake City > neighbourhood so the crumb
reinforces the /massage-salt-lake-city hub.

Idempotent: a page that already contains "BreadcrumbList" is skipped.

Run from the repo root:  python tools/inject-breadcrumbs.py
"""
import json, re, sys, pathlib

PAGES = {
    "pricing.html": [("Home", "/"), ("Pricing", "/pricing")],
    "faq.html": [("Home", "/"), ("FAQ", "/faq")],
    "contact.html": [("Home", "/"), ("Contact", "/contact")],
    "gift-cards.html": [("Home", "/"), ("Gift Cards", "/gift-cards")],
    "reviews.html": [("Home", "/"), ("Reviews", "/reviews")],
    "massage-salt-lake-city.html": [("Home", "/"), ("Massage in Salt Lake City", "/massage-salt-lake-city")],
    "massage-in-downtown-slc.html": [("Home", "/"), ("Salt Lake City", "/massage-salt-lake-city"), ("Downtown SLC", "/massage-in-downtown-slc")],
    "massage-in-sugar-house.html": [("Home", "/"), ("Salt Lake City", "/massage-salt-lake-city"), ("Sugar House", "/massage-in-sugar-house")],
    "massage-in-millcreek.html": [("Home", "/"), ("Salt Lake City", "/massage-salt-lake-city"), ("Millcreek", "/massage-in-millcreek")],
    "massage-in-the-avenues.html": [("Home", "/"), ("Salt Lake City", "/massage-salt-lake-city"), ("The Avenues", "/massage-in-the-avenues")],
}
BASE = "https://jmassageslc.com"
for name, crumbs in PAGES.items():
    p = pathlib.Path(name); html = p.read_text(encoding="utf-8")
    if "BreadcrumbList" in html: print("skip", name); continue
    ld = {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": BASE + u} for i, (n, u) in enumerate(crumbs)]}
    block = '  <script type="application/ld+json">\n  ' + json.dumps(ld, ensure_ascii=False) + '\n  </script>\n'
    new, n = re.subn(r"(</head>)", lambda m: block + m.group(1), html, count=1)
    if n != 1: sys.exit(f"no </head> in {name}")
    p.write_text(new, encoding="utf-8"); print("ok", name)
