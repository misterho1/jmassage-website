"""Tests for tools/reprice.py — the guarded price-restructure engine.

The risk reprice.py guards against is a silent page corruption, so the tests
focus on (1) the markup the helpers emit and (2) the count-guard / idempotency
contract of run(), exercised against a throwaway fixture rather than the live
tree (the real tree is already post-restructure, so its `old` strings are gone).
"""
import pytest

from conftest import load_tool

reprice = load_tool("reprice.py")


# ── helper builders ────────────────────────────────────────────────────────
def test_std_grid_emits_three_tiers_at_contract_prices():
    grid = reprice.std_grid("sixty copy", "ninety copy", "onetwenty copy")
    assert "60 Min" in grid and "90 Min" in grid and "120 Min" in grid
    assert "$85" in grid and "$125" in grid and "$165" in grid
    assert "sixty copy" in grid and "ninety copy" in grid and "onetwenty copy" in grid
    # The 90-min tier carries the "Most Popular" badge.
    assert "price-card__badge" in grid


def test_add_120_card_is_a_165_tier():
    card = reprice.add_120_card("two-hour journey")
    assert "120 Min" in card
    assert "$165" in card
    assert "two-hour journey" in card


# ── data integrity of the replacement table ────────────────────────────────
def test_every_replacement_rule_is_well_formed():
    for rel, rules in reprice.REPLACEMENTS.items():
        for old, new, n in rules:
            assert isinstance(n, int) and n >= 1, f"{rel}: bad count {n!r} for {old!r}"
            assert old != new, f"{rel}: no-op replacement {old!r}"
            assert old, f"{rel}: empty old string"


# ── the guarded engine ─────────────────────────────────────────────────────
@pytest.fixture
def synthetic_tree(tmp_path, monkeypatch):
    """Point reprice at a one-file fixture with a controlled replacement table."""
    (tmp_path / "page.html").write_text("price is $55 and again $55", encoding="utf-8")
    monkeypatch.setattr(reprice, "ROOT", tmp_path)
    monkeypatch.setattr(reprice, "REPLACEMENTS", {"page.html": [("$55", "$85", 2)]})
    return tmp_path


def test_check_only_reports_but_does_not_write(synthetic_tree):
    total = reprice.run(check_only=True)
    assert total == 2
    assert (synthetic_tree / "page.html").read_text(encoding="utf-8") == "price is $55 and again $55"


def test_apply_rewrites_the_file(synthetic_tree):
    reprice.run(check_only=False)
    assert (synthetic_tree / "page.html").read_text(encoding="utf-8") == "price is $85 and again $85"


def test_count_guard_aborts_on_drift(synthetic_tree):
    # Fixture has two "$55"; a rule that expects one must abort before writing.
    reprice.REPLACEMENTS["page.html"] = [("$55", "$85", 1)]
    with pytest.raises(AssertionError):
        reprice.run(check_only=False)


def test_rerun_after_apply_fails_the_guard(synthetic_tree):
    """Documented contract: re-running against the post-edit tree must abort,
    because the `old` strings are gone (count 0 != expected 2)."""
    reprice.run(check_only=False)
    with pytest.raises(AssertionError):
        reprice.run(check_only=True)
