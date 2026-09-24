"""Sync each page's FAQPage JSON-LD to the FAQ a visitor can see.

Google requires FAQ markup to describe content visible on the page, and this site
keeps two hand-written copies of every FAQ. The visible FAQ is the source: for each
page this rewrites only the FAQPage node's "mainEntity" list, word for word and in
page order, and leaves every other byte of the file alone (line endings included).
Each rewritten Question has the canonical shape (name and acceptedAnswer text), so
other properties on an old Question are not kept.

Visible Q&A items:
  <details>                        the <summary> is the question, the rest of the
                                   <details> is the answer (pricing, the Salt Lake City
                                   hub, blog posts)
  .faq-q, then .faq-a              faq, gift cards
  .faq-item__question, then
  .faq-item__answer                services/*, massage-in-*
Text follows check_faq_schema.py in the spa-blog skill: block tags break with a
space, inline tags join, hidden and sr-only text is skipped, whitespace is squashed.
It also skips aria-hidden elements, such as a decorative "+" toggle icon.

Run from the repo root:  python tools/sync-faq-schema.py [FILE ...]
With no FILE it syncs every page that has FAQPage JSON-LD. Prints ok / same / FAIL
per page. On any FAIL nothing is written and the exit code is 1.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# Tags that break a line of text. Inline tags (a, strong, em, span) join text with no space.
BLOCK = {"address", "article", "aside", "blockquote", "br", "dd", "details", "div", "dl", "dt",
         "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li",
         "main", "nav", "ol", "p", "pre", "section", "summary", "table", "td", "th", "tr", "ul"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
UNSEEN = {"head", "script", "style", "noscript", "template", "svg"}
HIDDEN_CLASSES = {"sr-only", "visually-hidden", "hidden"}
HIDDEN_STYLE = re.compile(r"display\s*:\s*none|visibility\s*:\s*hidden"
                          r"|clip\s*:\s*rect\(\s*0(?:px)?(?:\s*,?\s*0(?:px)?){3}\s*\)", re.I)
OPACITY = re.compile(r"opacity\s*:\s*(\d*\.?\d+)", re.I)
QUESTION_CLASSES = {"faq-q", "faq-item__question"}
ANSWER_CLASSES = {"faq-a", "faq-item__answer"}
LD_JSON = re.compile(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)
MAIN_ENTITY = re.compile(r'"mainEntity"\s*:\s*(?=\[)')
SKIP_DIRS = {"node_modules", "dist"}


def squash(text):
    return re.sub(r"\s+", " ", text).strip()


def _hidden(attrs):
    if "hidden" in attrs or HIDDEN_CLASSES & set((attrs.get("class") or "").split()):
        return True
    style = attrs.get("style") or ""
    opacity = OPACITY.search(style)
    return bool(HIDDEN_STYLE.search(style)) or (opacity is not None and float(opacity.group(1)) == 0)


class _VisibleFaq(HTMLParser):
    """Collects the page's visible FAQ as [question, answer] pairs, in page order."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items = []
        self.open = []  # (tag, mode before it opened, whether it hides its text)
        self.mode = None  # None, "summary", "details", "question" or "answer"
        self.unseen = 0

    def _add(self, text):
        if self.mode is None or self.unseen:
            return
        if self.mode in ("summary", "question"):
            self.items[-1][0] += text
        else:
            self.items[-1][1] += text

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if tag in BLOCK:
                self._add(" ")
            return
        attrs = dict(attrs)
        classes = set((attrs.get("class") or "").split())
        hides = tag in UNSEEN or _hidden(attrs) or (attrs.get("aria-hidden") or "").strip().lower() == "true"
        before = self.mode
        if self.mode is None and not self.unseen and not hides:
            if tag == "details":
                self.items.append(["", ""])
                self.mode = "details"
            elif classes & QUESTION_CLASSES:
                self.items.append(["", None])
                self.mode = "question"
            elif classes & ANSWER_CLASSES and self.items and self.items[-1][1] is None:
                self.items[-1][1] = ""
                self.mode = "answer"
        elif self.mode == "details" and tag == "summary":
            self.mode = "summary"
        if tag in BLOCK:
            self._add(" ")
        self.open.append((tag, before, hides))
        self.unseen += hides

    def handle_endtag(self, tag):
        if all(t != tag for t, _, _ in self.open):
            return
        while True:
            t, before, hides = self.open.pop()
            self.unseen -= hides
            if t == tag:
                break
        self.mode = before
        if tag in BLOCK:
            self._add(" ")

    def handle_data(self, data):
        self._add(data)


def visible_items(src):
    """The page's visible FAQ as (question, answer) pairs. The answer is None when a
    question has no answer element after it."""
    parser = _VisibleFaq()
    parser.feed(src)
    parser.close()
    return [(squash(q), None if a is None else squash(a)) for q, a in parser.items]


def _nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from _nodes(child)


def _is_faq_page(node):
    # Accepts "FAQPage", "schema:FAQPage" and "https://schema.org/FAQPage".
    types = node.get("@type")
    return any(isinstance(t, str) and re.split(r"[/#:]", t)[-1] == "FAQPage"
               for t in (types if isinstance(types, list) else [types]))


def _render(entries, old_text, old_count, indent, eol):
    """JSON text for the new mainEntity list, laid out like the old one."""
    if len(old_text.splitlines()) == old_count + 2:  # "[", one entry per line, "]"
        rows = [indent + "  " + json.dumps(entry, ensure_ascii=False) for entry in entries]
        text = "[" + eol + ("," + eol).join(rows) + eol + indent + "]"
    else:
        text = json.dumps(entries, indent=2, ensure_ascii=False).replace("\n", eol + indent)
    return text.replace("</", "<\\/")


def sync(path):
    """Return (status, message, new page text or None) for one page.
    status is "ok" (text to write), "same" (already in sync) or "FAIL"."""
    try:
        html = path.read_text(encoding="utf-8", newline="")
    except UnicodeDecodeError:
        return "FAIL", "not UTF-8", None
    except OSError as err:
        return "FAIL", f"cannot read ({err.strerror})", None
    faqs = []
    for block in LD_JSON.finditer(html):
        try:
            data = json.loads(block.group(1))
        except ValueError as err:
            return "FAIL", f"invalid JSON-LD ({err})", None
        faqs += [(block, node) for node in _nodes(data) if _is_faq_page(node)]
    if len(faqs) != 1:
        return "FAIL", f"expected 1 FAQPage node, found {len(faqs)}", None
    block, node = faqs[0]
    old = node.get("mainEntity")
    if not isinstance(old, list):
        return "FAIL", "FAQPage mainEntity is not an inline list", None
    items = visible_items(html)
    if not items:
        return "FAIL", "FAQPage but no visible FAQ", None
    for question, answer in items:
        if not question or not answer:
            return "FAIL", f"visible FAQ item without question or answer text: {question!r}", None
    entries = [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
               for q, a in items]
    if old == entries:
        return "same", f"{len(entries)} Q&As", None
    spans = []
    for key in MAIN_ENTITY.finditer(block.group(1)):
        try:
            value, end = json.JSONDecoder().raw_decode(block.group(1), key.end())
        except ValueError:
            continue
        if value == old:
            spans.append((block.start(1) + key.end(), block.start(1) + end))
    if len(spans) != 1:
        return "FAIL", "cannot locate the FAQPage mainEntity list in the page source", None
    start, end = spans[0]
    eol = "\r\n" if "\r\n" in html else "\n"
    indent = re.match(r"[ \t]*", html[html.rfind("\n", 0, start) + 1:]).group()
    new = html[:start] + _render(entries, html[start:end], len(old), indent, eol) + html[end:]
    return "ok", f"{len(entries)} Q&As (was {len(old)})", new


def _pages(root):
    """Every .html page under root that mentions FAQPage, skipping dot folders, node_modules and dist."""
    for path in sorted(root.rglob("*.html")):
        rel = path.relative_to(root)
        if any(part.startswith(".") or part in SKIP_DIRS for part in rel.parts[:-1]):
            continue
        if "FAQPage" in path.read_text(encoding="utf-8", errors="replace"):
            yield rel


def main(argv):
    paths = [Path(arg) for arg in argv] or list(_pages(Path(".")))
    if not paths:
        print("no FAQPage pages found under the current directory; run from the repo root")
        return 1
    results = [(path, *sync(path)) for path in paths]
    for path, status, message, _ in results:
        print(f"{status} {path.as_posix()}: {message}")
    if any(status == "FAIL" for _, status, _, _ in results):
        print("nothing written")
        return 1
    for path, status, _, new in results:
        if status == "ok":
            path.write_text(new, encoding="utf-8", newline="")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main(sys.argv[1:]))
