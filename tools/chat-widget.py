#!/usr/bin/env python3
"""Install (or refresh) the GoHighLevel chat-widget loader sitewide.

Inserts the LeadConnector loader <script> immediately before the closing
</body> tag of every .html page. Operates on raw bytes so existing UTF-8
content (e.g. the U+2605 stars) and per-file line endings are preserved
exactly. Idempotent: a page that already has the widget id is skipped, so
this can be re-run after new pages are added.

Usage: python tools/chat-widget.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
WIDGET_ID = b"6a35ff645dcabc40b5934513"
SNIPPET = (
    b'<script src="https://widgets.leadconnectorhq.com/loader.js" '
    b'data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" '
    b'data-widget-id="' + WIDGET_ID + b'" data-source="WEB_USER"></script>'
)

def install(root):
    """Insert the chat-widget loader before </body> in every .html under root.

    Returns (added, skipped, no_body) lists of paths. Idempotent: a page already
    carrying WIDGET_ID is skipped, and per-file line endings are preserved.
    """
    added, skipped, no_body = [], [], []

    for path in sorted(root.rglob("*.html")):
        if ".git" in path.parts:
            continue
        data = path.read_bytes()
        if WIDGET_ID in data:
            skipped.append(path)
            continue
        if b"</body>" not in data:
            no_body.append(path)
            continue
        eol = b"\r\n" if b"\r\n" in data else b"\n"
        block = b"  <!-- GoHighLevel chat widget -->" + eol + b"  " + SNIPPET + eol
        head, sep, tail = data.rpartition(b"</body>")
        path.write_bytes(head + block + sep + tail)
        added.append(path)

    return added, skipped, no_body


if __name__ == "__main__":
    added, skipped, no_body = install(ROOT)
    rel = lambda p: p.relative_to(ROOT).as_posix()
    print(f"added   ({len(added)}): " + ", ".join(rel(p) for p in added))
    print(f"skipped ({len(skipped)}): " + ", ".join(rel(p) for p in skipped))
    print(f"no body ({len(no_body)}): " + ", ".join(rel(p) for p in no_body))
