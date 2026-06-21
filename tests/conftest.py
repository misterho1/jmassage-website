"""Shared pytest fixtures and helpers for the J Massage SLC test suite.

Two layers are covered:
  * Cross-page HTML invariants (read-only, run against the real pages).
  * The Python maintenance tools in tools/ (run against throwaway fixtures).
"""
import importlib.util
import pathlib

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"


def load_tool(filename):
    """Import a tool module by filename, tolerating hyphenated names.

    tools/chat-widget.py is not importable as `import chat-widget`, so load it
    from its path. Each tool guards its side effects behind `__main__`, so an
    import only defines functions and constants.
    """
    path = TOOLS / filename
    mod_name = "tool_" + filename.replace("-", "_").removesuffix(".py")
    spec = importlib.util.spec_from_file_location(mod_name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="session")
def repo_root():
    return ROOT


@pytest.fixture(scope="session")
def html_pages():
    """Every .html page that ships in the site (root, services/, blog/)."""
    pages = (
        sorted(ROOT.glob("*.html"))
        + sorted((ROOT / "services").glob("*.html"))
        + sorted((ROOT / "blog").glob("*.html"))
    )
    return pages
