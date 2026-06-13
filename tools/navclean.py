"""Remove deleted-service nav-dropdown items (Hot Stone, Infrared Sauna) from every
J Massage page. Guarded: each file's count of the target lines is checked, and the
line is removed only if present. Reflexology + Foot/Head (now referral pages) are
KEPT in the nav. Run with --check first.
"""
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Each entry is removed (with its leading newline) wherever it appears, once per file.
# Two markup variants exist: root pages use /services/<slug>, service pages use ./<slug>.html
TARGET_LINES = [
    '\n              <li><a href="/services/hot-stone">Hot Stone</a></li>',
    '\n              <li><a href="/services/infrared-sauna">Infrared Sauna</a></li>',
    '\n              <li><a href="./hot-stone.html">Hot Stone</a></li>',
    '\n              <li><a href="./infrared-sauna.html">Infrared Sauna</a></li>',
]


def run(check_only=False):
    removed = 0
    files = sorted(ROOT.glob("*.html")) + sorted((ROOT / "services").glob("*.html"))
    for p in files:
        text = p.read_text(encoding="utf-8")
        orig = text
        for line in TARGET_LINES:
            c = text.count(line)
            # nav dropdown holds at most one of each; assert we never see more.
            assert c <= 1, f"{p.name}: unexpected {c}x of nav line {line!r}"
            if c == 1:
                text = text.replace(line, "")
                removed += 1
        if text != orig and not check_only:
            p.write_text(text, encoding="utf-8", newline="")
    print(f"{'CHECK' if check_only else 'APPLIED'}: removed {removed} nav lines")


if __name__ == "__main__":
    run(check_only="--check" in sys.argv)
