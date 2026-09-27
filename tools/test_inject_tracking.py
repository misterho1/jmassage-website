"""Tests for inject-tracking.py. Run from the repo root:
    python -m unittest discover -s tools -p "test_*.py" -v
"""
import contextlib
import importlib.util
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

_spec = importlib.util.spec_from_file_location("inject_tracking", Path(__file__).with_name("inject-tracking.py"))
tool = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tool)

GA_LINE = "    gtag('config', 'G-W8JB6XPYH9');\n"
ADS_LINE = "    gtag('config', 'AW-18046916928');\n"
GA_ONLY_HEAD = "".join([
    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-W8JB6XPYH9"></script>\n',
    '  <script>\n',
    '    window.dataLayer = window.dataLayer || [];\n',
    '    function gtag(){dataLayer.push(arguments);}\n',
    "    gtag('js', new Date());\n",
    GA_LINE,
    '  </script>\n',
])
FULL_HEAD = GA_ONLY_HEAD.replace(GA_LINE, GA_LINE + ADS_LINE)
TRACKING = '  <script src="/js/tracking.js" defer></script>\n'

# F1: a GA4 config call with a multi-line options object; the tail never reaches ');$'.
MULTILINE_GA_CONFIG_HEAD = "".join([
    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-W8JB6XPYH9"></script>\n',
    '  <script>\n',
    '    window.dataLayer = window.dataLayer || [];\n',
    '    function gtag(){dataLayer.push(arguments);}\n',
    "    gtag('js', new Date());\n",
    "    gtag('config', 'G-W8JB6XPYH9', {\n",
    "      'send_page_view': false\n",
    "    });\n",
    '  </script>\n',
])
# F1: </script> sits on the same line right after the GA4 config call.
INLINE_SCRIPT_CLOSE_HEAD = "".join([
    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-W8JB6XPYH9"></script>\n',
    '  <script>\n',
    '    window.dataLayer = window.dataLayer || [];\n',
    '    function gtag(){dataLayer.push(arguments);}\n',
    "    gtag('js', new Date());\n",
    "    gtag('config', 'G-W8JB6XPYH9');</script>\n",
])
# F3: a page copied from Elite Spa Utah — its own loader and configs, no J Massage GA_ID.
ELITE_HEAD = "".join([
    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-N0NTBPE7FC"></script>\n',
    '  <script>\n',
    '    window.dataLayer = window.dataLayer || [];\n',
    '    function gtag(){dataLayer.push(arguments);}\n',
    "    gtag('js', new Date());\n",
    "    gtag('config', 'G-N0NTBPE7FC');\n",
    "    gtag('config', 'AW-17967111406');\n",
    '  </script>\n',
])
# F3: the retired GA4 ID (loader + config) plus the current, real Ads config.
RETIRED_HEAD = "".join([
    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HR9MP6ENEP"></script>\n',
    '  <script>\n',
    '    window.dataLayer = window.dataLayer || [];\n',
    '    function gtag(){dataLayer.push(arguments);}\n',
    "    gtag('js', new Date());\n",
    "    gtag('config', 'G-HR9MP6ENEP');\n",
    "    gtag('config', 'AW-18046916928');\n",
    '  </script>\n',
])
# /book and /pricing: js/after-paint.js loads gtag.js after first paint.
LAZY_LOADER = '  <script src="/js/after-paint.js?v=1" defer data-gtag="interaction"></script>\n'
# The same pages as they ship: the lazy loader plus the inline stub with both configs.
BOOK_HEAD = LAZY_LOADER + FULL_HEAD.split("\n", 1)[1]


def page(head):
    """A minimal page laid out like blog/*.html: tag block in the head, tracking.js before </body>."""
    return f"<!doctype html>\n<html>\n<head>\n{head}</head>\n<body>\n{TRACKING}</body>\n</html>\n"


class InjectTracking(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.dir = tmp.name

    def write(self, name, text):
        path = os.path.join(self.dir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        return path

    def read(self, path):
        with open(path, encoding="utf-8") as f:
            return f.read()

    def test_ga_only_page_gets_ads_line_under_ga_line(self):  # blog.html + 6 posts
        path = self.write("post.html", page(GA_ONLY_HEAD))
        self.assertEqual(tool.process(path, apply=True), ["added-ads-config"])
        self.assertEqual(self.read(path), page(FULL_HEAD))

    def test_second_run_changes_nothing(self):
        path = self.write("post.html", page(GA_ONLY_HEAD))
        tool.process(path, apply=True)
        once = self.read(path)
        self.assertEqual(tool.process(path, apply=True), [])
        self.assertEqual(self.read(path), once)

    def test_complete_page_is_untouched(self):  # the 26 complete pages
        path = self.write("about.html", page(FULL_HEAD))
        self.assertEqual(tool.process(path, apply=True), [])
        self.assertEqual(self.read(path), page(FULL_HEAD))

    def test_untagged_page_gets_current_snippet_once(self):
        path = self.write("new.html", page(""))
        self.assertEqual(tool.process(path, apply=True), ["added-tag"])
        html = self.read(path)
        self.assertIn("gtag/js?id=G-W8JB6XPYH9", html)
        self.assertEqual(html.count("gtag('config', 'G-W8JB6XPYH9');"), 1)
        self.assertEqual(html.count("gtag('config', 'AW-18046916928');"), 1)
        self.assertNotIn("G-HR9MP6ENEP", html)

    def test_verification_file_is_never_yielded(self):  # googlebc76adba355f4f5a.html
        self.write("googlebc76adba355f4f5a.html", "google-site-verification: googlebc76adba355f4f5a.html")
        keep = self.write("index.html", page(FULL_HEAD))
        self.assertEqual(list(tool.iter_html(self.dir)), [keep])

    def test_ga_id_only_in_a_comment_is_reported_not_changed(self):
        src = page("  <!-- Google tag (gtag.js) - G-W8JB6XPYH9 -->\n")
        path = self.write("odd.html", src)
        self.assertEqual(tool.process(path, apply=True), ["NO-GA-CONFIG(skipped-ads)"])
        self.assertEqual(self.read(path), src)

    def test_dry_run_never_writes(self):
        path = self.write("post.html", page(GA_ONLY_HEAD))
        self.assertEqual(tool.process(path, apply=False), ["added-ads-config"])
        self.assertEqual(self.read(path), page(GA_ONLY_HEAD))

    def test_multiline_ga_config_options_reports_not_changed(self):  # (a)
        src = page(MULTILINE_GA_CONFIG_HEAD)
        path = self.write("multiline.html", src)
        self.assertEqual(tool.process(path, apply=True), ["NO-GA-CONFIG(skipped-ads)"])
        self.assertEqual(self.read(path), src)

    def test_script_close_on_ga_config_line_reports_not_changed(self):  # (b)
        src = page(INLINE_SCRIPT_CLOSE_HEAD)
        path = self.write("inline.html", src)
        self.assertEqual(tool.process(path, apply=True), ["NO-GA-CONFIG(skipped-ads)"])
        self.assertEqual(self.read(path), src)

    def test_other_gtag_loader_and_config_is_not_stacked(self):  # (c)
        src = page(ELITE_HEAD)
        path = self.write("elite.html", src)
        self.assertEqual(tool.process(path, apply=True), ["OTHER-GTAG(skipped-tag)"])
        self.assertEqual(self.read(path), src)

    def test_retired_ga_id_with_current_ads_config_is_not_stacked(self):  # (d)
        src = page(RETIRED_HEAD)
        path = self.write("feedback.html", src)
        self.assertEqual(tool.process(path, apply=True), ["OTHER-GTAG(skipped-tag)"])
        self.assertEqual(self.read(path), src)

    def test_google_prefixed_page_without_16_hex_chars_is_yielded(self):  # (e)
        keep1 = self.write("googlecafe.html", page(FULL_HEAD))
        keep2 = self.write("google1.html", page(FULL_HEAD))
        self.write("googlebc76adba355f4f5a.html", "google-site-verification: googlebc76adba355f4f5a.html")
        self.assertEqual(sorted(tool.iter_html(self.dir)), sorted([keep1, keep2]))

    def test_dot_directories_are_skipped(self):  # (f)
        self.write(os.path.join(".claude", "worktrees", "x", "index.html"), page(FULL_HEAD))
        self.write(os.path.join(".superpowers", "brainstorm", "s", "a.html"), page(FULL_HEAD))
        keep = self.write(os.path.join("sub", "page.html"), page(FULL_HEAD))
        self.assertEqual(list(tool.iter_html(self.dir)), [keep])

    def test_ads_line_matches_ga_line_indent(self):  # (g)
        for indent in ["\t", "  "]:
            with self.subTest(indent=repr(indent)):
                head = "".join([
                    '  <script async src="https://www.googletagmanager.com/gtag/js?id=G-W8JB6XPYH9"></script>\n',
                    '  <script>\n',
                    '    window.dataLayer = window.dataLayer || [];\n',
                    '    function gtag(){dataLayer.push(arguments);}\n',
                    "    gtag('js', new Date());\n",
                    f"{indent}gtag('config', 'G-W8JB6XPYH9');\n",
                    '  </script>\n',
                ])
                path = self.write("indent.html", page(head))
                self.assertEqual(tool.process(path, apply=True), ["added-ads-config"])
                expected = head.replace(
                    f"{indent}gtag('config', 'G-W8JB6XPYH9');\n",
                    f"{indent}gtag('config', 'G-W8JB6XPYH9');\n{indent}gtag('config', 'AW-18046916928');\n")
                self.assertEqual(self.read(path), page(expected))

    def test_ads_config_with_double_quotes_and_spacing_counts_as_configured(self):  # (h)
        head = GA_ONLY_HEAD.replace(GA_LINE, GA_LINE + '    gtag( "config" , "AW-18046916928" )\n')
        path = self.write("spaced.html", page(head))
        self.assertEqual(tool.process(path, apply=True), [])
        self.assertEqual(self.read(path), page(head))

    def test_after_paint_page_without_inline_tag_gets_no_eager_loader(self):
        src = page(LAZY_LOADER)
        path = self.write("lazy.html", src)
        self.assertEqual(tool.process(path, apply=True), ["LAZY-GTAG(skipped-tag)"])
        self.assertEqual(self.read(path), src)

    def test_after_paint_page_with_inline_stub_is_complete(self):  # /book and /pricing today
        src = page(BOOK_HEAD)
        path = self.write("book.html", src)
        self.assertEqual(tool.process(path, apply=True), [])
        self.assertEqual(self.read(path), src)

    def test_commented_out_ads_line_is_reported_not_counted(self):
        src = page(GA_ONLY_HEAD + "  <!-- gtag('config', 'AW-18046916928'); -->\n")
        path = self.write("commented.html", src)
        self.assertEqual(tool.process(path, apply=True), ["COMMENTED-ADS(skipped-ads)"])
        self.assertEqual(self.read(path), src)

    def test_ga_config_line_inside_a_comment_is_not_an_anchor(self):
        head = GA_ONLY_HEAD.replace(GA_LINE, "") + "  <!--\n" + GA_LINE + "  -->\n"
        path = self.write("anchor.html", page(head))
        self.assertEqual(tool.process(path, apply=True), ["NO-GA-CONFIG(skipped-ads)"])
        self.assertEqual(self.read(path), page(head))

    def test_bare_foreign_config_without_loader_is_not_stacked(self):  # a GTM-managed page
        src = page("  <script>\n    gtag('config', 'UA-11111111-1');\n  </script>\n")
        path = self.write("gtm.html", src)
        self.assertEqual(tool.process(path, apply=True), ["OTHER-GTAG(skipped-tag)"])
        self.assertEqual(self.read(path), src)

    def run_main(self, *args):
        """Run main() from self.dir; return (exit code, printed output)."""
        out = io.StringIO()
        cwd = os.getcwd()
        os.chdir(self.dir)
        try:
            with mock.patch.object(sys, "argv", ["inject-tracking.py", *args]), contextlib.redirect_stdout(out):
                code = tool.main()
        finally:
            os.chdir(cwd)
        return code, out.getvalue()

    def test_dry_run_exits_1_while_anything_is_listed(self):
        self.write("post.html", page(GA_ONLY_HEAD))
        code, out = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("WOULD", out)
        self.assertEqual(self.run_main("--apply")[0], 0)
        code, out = self.run_main()
        self.assertEqual(code, 0)
        self.assertIn("0 file(s) need changes", out)

    def test_apply_says_skipped_for_a_page_it_cannot_fix(self):
        src = page(LAZY_LOADER)
        path = self.write("lazy.html", src)
        code, out = self.run_main("--apply")
        self.assertEqual(code, 1)
        self.assertIn("SKIPPED", out)
        self.assertNotIn("WROTE", out)
        self.assertEqual(self.read(path), src)

    def test_other_tag_id_in_a_js_file_is_reported_stale(self):
        self.write("index.html", page(FULL_HEAD))
        self.write(os.path.join("js", "after-paint.js"),
                   "var GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=G-OLDOLDOLD1';\n")
        self.write(os.path.join("js", "tracking.js"), "var GA = 'G-W8JB6XPYH9'; // AW-18046916928\n")
        self.write(os.path.join("js", "vendor", "lib.js"), "var x = 'G-VENDORVEND';\n")
        code, out = self.run_main()
        self.assertEqual(code, 1)
        self.assertEqual(out.count("STALE-ID"), 1)
        self.assertIn("G-OLDOLDOLD1", out)
        self.assertNotIn("G-VENDORVEND", out)


if __name__ == "__main__":
    unittest.main()
