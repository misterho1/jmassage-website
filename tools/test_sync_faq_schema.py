"""Tests for sync-faq-schema.py. Run from the repo root:
    python -m unittest discover -s tools -p "test_*.py" -v
"""
import importlib.util
import json
import os
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

_spec = importlib.util.spec_from_file_location("sync_faq_schema", Path(__file__).with_name("sync-faq-schema.py"))
tool = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tool)

LOCAL_BUSINESS = ('  <script type="application/ld+json">\n'
                  '  {"@context": "https://schema.org", "@type": "LocalBusiness", "name": "J Massage SLC"}\n'
                  '  </script>\n')
SERVICE_FAQ = ('<ul class="faq-list" role="list">\n'
               '  <li class="faq-item reveal-card">\n'
               '    <button class="faq-item__question" aria-expanded="false">\n'
               '      Will it hurt?\n'
               '      <span class="faq-item__icon" aria-hidden="true"></span>\n'
               '    </button>\n'
               '    <div class="faq-item__answer">\n'
               '      <p>It should feel firm, not sharp.</p>\n'
               '    </div>\n'
               '  </li>\n'
               '</ul>')


def faq_block(pairs):
    """A FAQPage script block laid out like services/*.html (json.dumps, indent 2)."""
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}
    body = json.dumps(ld, indent=2, ensure_ascii=False).replace("\n", "\n  ")
    return f'  <script type="application/ld+json">\n  {body}\n  </script>\n'


def page(head, body):
    return f"<!doctype html>\n<html>\n<head>\n{head}</head>\n<body>\n{body}\n</body>\n</html>\n"


class VisibleItems(unittest.TestCase):
    def test_details_with_answer_div(self):  # pricing.html, massage-salt-lake-city.html
        src = ('<details class="faq-item"><summary class="faq-item__q">How much is a massage?'
               '<span class="icon"></span></summary><div class="faq-body">$85 for 60 minutes.</div></details>')
        self.assertEqual(tool.visible_items(src), [("How much is a massage?", "$85 for 60 minutes.")])

    def test_details_with_paragraph(self):  # blog posts
        src = "<details><summary>Can we book together?</summary><p>Yes &amp; side by side.</p></details>"
        self.assertEqual(tool.visible_items(src), [("Can we book together?", "Yes & side by side.")])

    def test_faq_q_then_faq_a(self):  # faq.html, gift-cards.html
        src = ('<div class="faq-item"><div class="faq-q" role="button">Where are you? '
               '<svg viewBox="0 0 24 24"><title>plus</title><path d="M12 5v14M5 12h14"/></svg></div>'
               '<div class="faq-a">677 S 200 W Suite #C.</div></div>')
        self.assertEqual(tool.visible_items(src), [("Where are you?", "677 S 200 W Suite #C.")])

    def test_service_question_then_answer(self):  # services/*.html, massage-in-*.html
        self.assertEqual(tool.visible_items(SERVICE_FAQ), [("Will it hurt?", "It should feel firm, not sharp.")])

    def test_inline_tags_join_and_block_tags_space(self):
        src = ('<details><summary>How do I book?</summary><p>Call <a href="tel:+18012881118">(801) 288-1118</a>.'
               '</p><ul><li>Online</li><li>By phone</li></ul></details>')
        self.assertEqual(tool.visible_items(src), [("How do I book?", "Call (801) 288-1118. Online By phone")])

    def test_hidden_text_is_skipped(self):
        src = ('<details><summary>Q?</summary><p>Seen<span class="sr-only"> one</span><span hidden> two</span>'
               '<span style="display: none"> three</span><span style="opacity:0"> four</span>.</p></details>')
        self.assertEqual(tool.visible_items(src), [("Q?", "Seen.")])

    def test_aria_hidden_icon_is_skipped(self):  # massage-salt-lake-city.html
        src = ('<details class="faq-item"><summary class="faq-item__q">'
               '<span class="faq-item__q-text">Do you take walk-ins?</span>'
               '<span class="faq-item__icon" aria-hidden="true">+</span></summary>'
               '<div class="faq-item__a"><p>Yes, based on availability.</p></div></details>')
        self.assertEqual(tool.visible_items(src), [("Do you take walk-ins?", "Yes, based on availability.")])

    def test_whitespace_squashed_and_entities_decoded(self):
        src = ('<div class="faq-q">\n  Is it   safe?\n</div>\n'
               '<div class="faq-a">Yes&nbsp;&nbsp;it is &ldquo;safe&rdquo;.</div>')
        self.assertEqual(tool.visible_items(src), [("Is it safe?", "Yes it is \u201csafe\u201d.")])

    def test_question_without_answer(self):
        self.assertEqual(tool.visible_items('<div class="faq-q">Orphan?</div>'), [("Orphan?", None)])

    def test_head_and_scripts_are_not_faq(self):
        src = page('  <script type="application/ld+json">{"@type": "FAQPage"}</script>\n',
                   '<script>var s = "<details><summary>x</summary></details>";</script><p>No FAQ here.</p>')
        self.assertEqual(tool.visible_items(src), [])


class Sync(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, name, text):
        path = self.dir / name
        path.write_text(text, encoding="utf-8", newline="")
        return path

    def assertFails(self, text, reason):
        status, message, new = tool.sync(self.write("bad.html", text))
        self.assertEqual(status, "FAIL")
        self.assertIn(reason, message)
        self.assertIsNone(new)

    def test_rewrites_only_main_entity(self):
        head = LOCAL_BUSINESS + faq_block([("Will it hurt?", "Old answer.")])
        status, message, new = tool.sync(self.write("svc.html", page(head, SERVICE_FAQ)))
        self.assertEqual((status, message), ("ok", "1 Q&As (was 1)"))
        expected = page(LOCAL_BUSINESS + faq_block([("Will it hurt?", "It should feel firm, not sharp.")]), SERVICE_FAQ)
        self.assertEqual(new, expected)

    def test_visible_only_added_and_json_ld_only_dropped(self):
        body = SERVICE_FAQ.replace("</ul>", '  <li class="faq-item"><button class="faq-item__question">New?</button>'
                                            '<div class="faq-item__answer"><p>Yes.</p></div></li>\n</ul>')
        head = faq_block([("Gone?", "Only in the JSON-LD."), ("Will it hurt?", "It should feel firm, not sharp.")])
        status, message, new = tool.sync(self.write("svc.html", page(head, body)))
        self.assertEqual((status, message), ("ok", "2 Q&As (was 2)"))
        self.assertEqual(new, page(faq_block([("Will it hurt?", "It should feel firm, not sharp."), ("New?", "Yes.")]), body))

    def test_faq_page_inside_graph(self):  # pricing.html
        graph = {"@context": "https://schema.org", "@graph": [
            {"@type": "LocalBusiness", "name": "J Massage SLC"},
            {"@type": "FAQPage", "mainEntity": [
                {"@type": "Question", "name": "Will it hurt?", "acceptedAnswer": {"@type": "Answer", "text": "Old."}}]}]}
        head = ('  <script type="application/ld+json">\n  ' + json.dumps(graph, indent=2).replace("\n", "\n  ")
                + '\n  </script>\n')
        status, _, new = tool.sync(self.write("pricing.html", page(head, SERVICE_FAQ)))
        self.assertEqual(status, "ok")
        self.assertEqual(new, page(head.replace('"Old."', '"It should feel firm, not sharp."'), SERVICE_FAQ))

    def test_one_entry_per_line_layout_kept(self):  # blog posts
        head = ('  <script type="application/ld+json">\n'
                '  {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [\n'
                '    {"@type": "Question", "name": "Q1?", "acceptedAnswer": {"@type": "Answer", "text": "Old one."}},\n'
                '    {"@type": "Question", "name": "Q2?", "acceptedAnswer": {"@type": "Answer", "text": "Two."}}\n'
                '  ]}\n'
                '  </script>\n')
        body = "<details><summary>Q1?</summary><p>One.</p></details>\n<details><summary>Q2?</summary><p>Two.</p></details>"
        status, _, new = tool.sync(self.write("post.html", page(head, body)))
        self.assertEqual(status, "ok")
        self.assertEqual(new, page(head.replace("Old one.", "One."), body))

    def test_crlf_line_endings_kept(self):
        head = LOCAL_BUSINESS + faq_block([("Will it hurt?", "Old answer.")])
        status, _, new = tool.sync(self.write("crlf.html", page(head, SERVICE_FAQ).replace("\n", "\r\n")))
        self.assertEqual(status, "ok")
        expected = page(LOCAL_BUSINESS + faq_block([("Will it hurt?", "It should feel firm, not sharp.")]), SERVICE_FAQ)
        self.assertEqual(new, expected.replace("\n", "\r\n"))

    def test_same_when_already_in_sync(self):
        path = self.write("svc.html", page(faq_block([("Will it hurt?", "It should feel firm, not sharp.")]), SERVICE_FAQ))
        self.assertEqual(tool.sync(path), ("same", "1 Q&As", None))

    def test_script_end_tag_is_escaped(self):
        body = "<details><summary>Q?</summary><p>Type &lt;/script&gt; safely.</p></details>"
        status, _, new = tool.sync(self.write("x.html", page(faq_block([("Q?", "Old.")]), body)))
        self.assertEqual(status, "ok")
        self.assertIn('"text": "Type <\\/script> safely."', new)
        ld = json.loads(tool.LD_JSON.search(new).group(1))
        self.assertEqual(ld["mainEntity"][0]["acceptedAnswer"]["text"], "Type </script> safely.")

    def test_fail_no_faq_page(self):
        self.assertFails(page(LOCAL_BUSINESS, SERVICE_FAQ), "found 0")

    def test_fail_two_faq_pages(self):
        block = faq_block([("Will it hurt?", "x")])
        self.assertFails(page(block + block, SERVICE_FAQ), "found 2")

    def test_fail_main_entity_not_a_list(self):
        head = '  <script type="application/ld+json">{"@type": "FAQPage", "mainEntity": {"@id": "#q1"}}</script>\n'
        self.assertFails(page(head, SERVICE_FAQ), "not an inline list")

    def test_fail_no_visible_faq(self):
        self.assertFails(page(faq_block([("Will it hurt?", "x")]), "<p>No FAQ.</p>"), "no visible FAQ")

    def test_fail_question_without_answer(self):
        self.assertFails(page(faq_block([("Orphan?", "x")]), '<div class="faq-q">Orphan?</div>'),
                         "without question or answer")

    def test_fail_empty_answer(self):
        self.assertFails(page(faq_block([("Q?", "x")]), "<details><summary>Q?</summary><p> </p></details>"),
                         "without question or answer")

    def test_fail_invalid_json_ld(self):
        self.assertFails(page('  <script type="application/ld+json">{"@type": "FAQPage",}</script>\n', SERVICE_FAQ),
                         "invalid JSON-LD")

    def test_fail_not_utf8(self):
        path = self.dir / "latin1.html"
        path.write_bytes(page(faq_block([("Q?", "caf\u00e9")]), SERVICE_FAQ).encode("latin-1"))
        self.assertEqual(tool.sync(path)[:2], ("FAIL", "not UTF-8"))


class Main(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.cwd = os.getcwd()
        os.chdir(self.dir)

    def tearDown(self):
        os.chdir(self.cwd)
        self.tmp.cleanup()

    def write(self, name, text):
        path = Path(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="")
        return path

    def run_main(self, argv):
        with redirect_stdout(StringIO()) as out:
            code = tool.main(argv)
        return code, out.getvalue().splitlines()

    def test_any_fail_writes_nothing(self):
        good = self.write("good.html", page(faq_block([("Will it hurt?", "Old answer.")]), SERVICE_FAQ))
        self.write("bad.html", page(LOCAL_BUSINESS, SERVICE_FAQ))
        before = good.read_text(encoding="utf-8")
        code, lines = self.run_main(["good.html", "bad.html"])
        self.assertEqual(code, 1)
        self.assertEqual(lines[-1], "nothing written")
        self.assertEqual(good.read_text(encoding="utf-8"), before)

    def test_second_run_reports_same(self):
        self.write("svc.html", page(faq_block([("Will it hurt?", "Old answer.")]), SERVICE_FAQ))
        self.assertEqual(self.run_main(["svc.html"]), (0, ["ok svc.html: 1 Q&As (was 1)"]))
        self.assertEqual(self.run_main(["svc.html"]), (0, ["same svc.html: 1 Q&As"]))

    def test_no_args_syncs_every_faq_page(self):
        faq_page = page(faq_block([("Will it hurt?", "It should feel firm, not sharp.")]), SERVICE_FAQ)
        self.write("services/a.html", faq_page)
        self.write("b.html", page(LOCAL_BUSINESS, "<p>No FAQ.</p>"))
        self.write(".claude/worktrees/c.html", faq_page)
        self.write("dist/d.html", faq_page)
        self.write("node_modules/e.html", faq_page)
        self.assertEqual(self.run_main([]), (0, ["same services/a.html: 1 Q&As"]))


if __name__ == "__main__":
    unittest.main()
