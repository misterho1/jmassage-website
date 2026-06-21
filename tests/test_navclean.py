"""Tests for tools/navclean.py — removing deleted-service nav items."""
import pytest

from conftest import load_tool

navclean = load_tool("navclean.py")

HOT_STONE = '\n              <li><a href="/services/hot-stone">Hot Stone</a></li>'
INFRARED = '\n              <li><a href="/services/infrared-sauna">Infrared Sauna</a></li>'
REFLEXOLOGY = '\n              <li><a href="/services/reflexology">Reflexology</a></li>'


@pytest.fixture
def tree(tmp_path, monkeypatch):
    monkeypatch.setattr(navclean, "ROOT", tmp_path)
    return tmp_path


def test_removes_deleted_services_and_keeps_referrals(tree):
    page = tree / "index.html"
    page.write_text(f"<ul>{HOT_STONE}{INFRARED}{REFLEXOLOGY}\n</ul>", encoding="utf-8")
    navclean.run(check_only=False)
    out = page.read_text(encoding="utf-8")
    assert "Hot Stone" not in out
    assert "Infrared Sauna" not in out
    assert "Reflexology" in out  # referral page stays in the nav


def test_check_mode_does_not_write(tree):
    page = tree / "index.html"
    original = f"<ul>{HOT_STONE}\n</ul>"
    page.write_text(original, encoding="utf-8")
    navclean.run(check_only=True)
    assert page.read_text(encoding="utf-8") == original


def test_is_idempotent(tree):
    page = tree / "index.html"
    page.write_text(f"<ul>{HOT_STONE}{INFRARED}\n</ul>", encoding="utf-8")
    navclean.run(check_only=False)
    once = page.read_text(encoding="utf-8")
    navclean.run(check_only=False)
    assert page.read_text(encoding="utf-8") == once


def test_guard_aborts_when_a_nav_line_appears_twice(tree):
    page = tree / "index.html"
    page.write_text(f"<ul>{HOT_STONE}{HOT_STONE}\n</ul>", encoding="utf-8")
    with pytest.raises(AssertionError):
        navclean.run(check_only=False)
