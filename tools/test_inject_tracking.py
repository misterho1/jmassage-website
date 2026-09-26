"""Tests for inject-tracking.py. Run from the repo root:
    python -m unittest discover -s tools -p "test_*.py" -v
"""
import importlib.util
import os
import tempfile
import unittest
from pathlib import Path

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


if __name__ == "__main__":
    unittest.main()
