"""Tests for tools/chat-widget.py — sitewide chat-widget loader install."""
import pytest

from conftest import load_tool

chat = load_tool("chat-widget.py")


@pytest.fixture
def tree(tmp_path):
    return tmp_path


def test_inserts_snippet_before_closing_body(tree):
    page = tree / "page.html"
    page.write_text("<html><body>hi</body></html>", encoding="utf-8")
    added, skipped, no_body = chat.install(tree)
    assert page in added
    data = page.read_bytes()
    assert chat.WIDGET_ID in data
    # Snippet must land before </body>, not after it.
    assert data.index(chat.WIDGET_ID) < data.index(b"</body>")


def test_skips_pages_that_already_have_the_widget(tree):
    page = tree / "page.html"
    page.write_text("<html><body>hi</body></html>", encoding="utf-8")
    chat.install(tree)
    before = page.read_bytes()
    added, skipped, _ = chat.install(tree)  # second pass
    assert page in skipped
    assert page not in added
    assert page.read_bytes() == before  # idempotent — no double insert


def test_reports_pages_without_a_body(tree):
    page = tree / "fragment.html"
    page.write_text("<div>no body here</div>", encoding="utf-8")
    added, skipped, no_body = chat.install(tree)
    assert page in no_body
    assert chat.WIDGET_ID not in page.read_bytes()


def test_preserves_crlf_line_endings(tree):
    page = tree / "win.html"
    page.write_bytes(b"<html>\r\n<body>hi</body>\r\n</html>")
    chat.install(tree)
    data = page.read_bytes()
    assert b"\r\n" in data
    assert b"\n" not in data.replace(b"\r\n", b"")  # no bare LF introduced
