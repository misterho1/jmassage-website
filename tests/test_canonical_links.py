"""Tests for tools/canonical-links.py — internal links to canonical URLs."""
import pytest

from conftest import load_tool

canonical = load_tool("canonical-links.py")


def test_replacement_table_covers_book_and_every_slug():
    pairs = dict(canonical.REPLACEMENTS)
    assert pairs['href="/book.html"'] == 'href="/book"'
    for slug in canonical.SLUGS:
        assert pairs[f'href="./{slug}.html"'] == f'href="/services/{slug}"'
        assert pairs[f'href="/services/{slug}.html"'] == f'href="/services/{slug}"'


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(canonical, "ROOT", tmp_path)
    return tmp_path


def test_rewrites_html_and_service_links(tree):
    page = tree / "index.html"
    page.write_text(
        '<a href="/book.html">Book</a>'
        '<a href="./swedish-massage.html">Swedish</a>'
        '<a href="/services/ashiatsu.html">Ashiatsu</a>',
        encoding="utf-8",
    )
    canonical.main(check=False)
    out = page.read_text(encoding="utf-8")
    assert 'href="/book"' in out
    assert 'href="/services/swedish-massage"' in out
    assert 'href="/services/ashiatsu"' in out
    assert ".html" not in out


def test_check_mode_does_not_write(tree):
    page = tree / "index.html"
    original = '<a href="/book.html">Book</a>'
    page.write_text(original, encoding="utf-8")
    canonical.main(check=True)
    assert page.read_text(encoding="utf-8") == original


def test_is_idempotent(tree):
    page = tree / "index.html"
    page.write_text('<a href="/book.html">Book</a>', encoding="utf-8")
    canonical.main(check=False)
    once = page.read_text(encoding="utf-8")
    canonical.main(check=False)  # second pass should be a no-op
    assert page.read_text(encoding="utf-8") == once


def test_only_touches_hrefs_not_body_text(tree):
    page = tree / "index.html"
    page.write_text(
        '<a href="./swedish-massage.html">Visit swedish-massage.html today</a>',
        encoding="utf-8",
    )
    canonical.main(check=False)
    out = page.read_text(encoding="utf-8")
    # The visible label keeps its literal ".html"; only the href is rewritten.
    assert "Visit swedish-massage.html today" in out
    assert 'href="/services/swedish-massage"' in out
