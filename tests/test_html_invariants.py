"""Cross-page HTML invariants.

These run read-only against the real pages and lock in the consistency rules
that the tools/ scripts exist to enforce — the same class of drift recorded in
tasks/lessons.md (stale canonicals, schema/price mismatches). A failure here is
a genuine content regression, not a flaky test.
"""
import json
import re

import pytest

# Pages that are intentionally not indexable content and carry no canonical /
# structured data (error page + Google site-verification stub).
NO_CANONICAL = {"404.html", "googlebc76adba355f4f5a.html"}

# Service-page price contract (2026-06-13 restructure).
STANDARD_SERVICES = {
    "swedish-massage", "deep-tissue", "sports-massage", "ashiatsu",
    "shiatsu", "thai-massage", "myofascial", "prenatal",
}
PREMIUM_SERVICES = {"couples-massage", "4-hand-massage"}
# Referral-only pages with a single intro price — exempt from the 3-tier grid.
REFERRAL_SERVICES = {"reflexology", "foot-massage-head-spa"}

STANDARD_PRICES = {85, 125, 165}
PREMIUM_PRICES = {165, 245, 325}
ALLOWED_OFFER_PRICES = {85, 125, 165, 245, 325}

CANONICAL_RE = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"')
OG_URL_RE = re.compile(r'<meta\s+property="og:url"\s+content="([^"]+)"')
LDJSON_RE = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL
)
PRICE_CARD_RE = re.compile(r'price-card__amount[^>]*>(?:<sup>\$</sup>)?\$?(\d+)')
OFFER_PRICE_RE = re.compile(r'"price":\s*"(\d+)"')


def _ids(paths):
    return [p.name for p in paths]


# ── SEO: canonical + Open Graph ────────────────────────────────────────────
def test_indexable_pages_have_exactly_one_canonical(html_pages):
    for page in html_pages:
        if page.name in NO_CANONICAL:
            continue
        hits = CANONICAL_RE.findall(page.read_text(encoding="utf-8"))
        assert len(hits) == 1, f"{page.name}: expected 1 canonical, found {len(hits)}"


def test_canonical_matches_og_url(html_pages):
    for page in html_pages:
        text = page.read_text(encoding="utf-8")
        canon = CANONICAL_RE.findall(text)
        og = OG_URL_RE.findall(text)
        if not canon or not og:
            continue
        assert canon[0] == og[0], (
            f"{page.name}: canonical {canon[0]!r} != og:url {og[0]!r}"
        )


# ── Structured data ────────────────────────────────────────────────────────
def test_all_jsonld_blocks_are_valid_json(html_pages):
    for page in html_pages:
        for i, block in enumerate(LDJSON_RE.findall(page.read_text(encoding="utf-8"))):
            try:
                json.loads(block)
            except json.JSONDecodeError as exc:
                pytest.fail(f"{page.name}: JSON-LD block #{i} is invalid: {exc}")


def test_service_offer_prices_are_within_contract(repo_root):
    for page in sorted((repo_root / "services").glob("*.html")):
        for block in LDJSON_RE.findall(page.read_text(encoding="utf-8")):
            for price in OFFER_PRICE_RE.findall(block):
                assert int(price) in ALLOWED_OFFER_PRICES, (
                    f"{page.name}: JSON-LD Offer price ${price} not in contract "
                    f"{sorted(ALLOWED_OFFER_PRICES)}"
                )


# ── Visible price contract ─────────────────────────────────────────────────
def _service_slug(page):
    return page.stem


def test_standard_service_pages_show_85_125_165(repo_root):
    for page in sorted((repo_root / "services").glob("*.html")):
        if _service_slug(page) not in STANDARD_SERVICES:
            continue
        amounts = {int(a) for a in PRICE_CARD_RE.findall(page.read_text(encoding="utf-8"))}
        assert amounts == STANDARD_PRICES, (
            f"{page.name}: price cards {sorted(amounts)} != {sorted(STANDARD_PRICES)}"
        )


def test_premium_service_pages_show_165_245_325(repo_root):
    for page in sorted((repo_root / "services").glob("*.html")):
        if _service_slug(page) not in PREMIUM_SERVICES:
            continue
        amounts = {int(a) for a in PRICE_CARD_RE.findall(page.read_text(encoding="utf-8"))}
        assert amounts == PREMIUM_PRICES, (
            f"{page.name}: price cards {sorted(amounts)} != {sorted(PREMIUM_PRICES)}"
        )


def test_every_service_page_is_classified(repo_root):
    """Guard against a new service page silently escaping the price checks."""
    known = STANDARD_SERVICES | PREMIUM_SERVICES | REFERRAL_SERVICES
    for page in sorted((repo_root / "services").glob("*.html")):
        assert _service_slug(page) in known, (
            f"{page.name} is not classified in test_html_invariants.py — "
            "add it to STANDARD/PREMIUM/REFERRAL so its prices get checked"
        )


# ── Booking links ──────────────────────────────────────────────────────────
def test_booking_links_use_canonical_extensionless_form(html_pages):
    """All booking CTAs must point at /book, never the 308-redirecting book.html."""
    for page in html_pages:
        text = page.read_text(encoding="utf-8")
        assert 'href="/book.html"' not in text, f"{page.name} links book.html (use /book)"
        assert 'href="./book.html"' not in text, f"{page.name} links ./book.html (use /book)"


# ── Navigation hygiene ─────────────────────────────────────────────────────
def test_nav_does_not_link_deleted_services(html_pages):
    """Hot Stone / Infrared Sauna became add-ons; no page should link them as services."""
    dead = ['>Hot Stone</a>', '>Infrared Sauna</a>']
    for page in html_pages:
        text = page.read_text(encoding="utf-8")
        for marker in dead:
            assert marker not in text, f"{page.name} still links a deleted service ({marker})"
