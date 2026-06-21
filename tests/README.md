# Tests

Automated tests for the J Massage SLC site. Pure Python (`pytest`), no Node
toolchain required.

```bash
pip install -r requirements-dev.txt
pytest
```

## What's covered

**Cross-page HTML invariants** (`test_html_invariants.py`) — run read-only
against the real pages and catch the content drift the `tools/` scripts exist to
prevent (the failure modes recorded in `tasks/lessons.md`):

- exactly one `rel="canonical"` per indexable page, matching its `og:url`
- every `application/ld+json` block is valid JSON
- service-page price contract: Standard `$85/$125/$165`, Premium
  `$165/$245/$325`, and all JSON-LD `Offer` prices within the contract
- booking CTAs use the canonical `/book` (never the redirecting `book.html`)
- no page links a deleted service (Hot Stone, Infrared Sauna)
- a guard that fails if a new service page isn't classified for price checks

**Maintenance tools** (`test_reprice.py`, `test_canonical_links.py`,
`test_navclean.py`, `test_chat_widget.py`) — exercise each tool's core against
throwaway fixtures: the count-guard / abort behavior, idempotency, and that they
only touch what they claim to (hrefs, nav lines, line endings).

## Not yet covered

The front-end JS (`js/main.js` carousel wraparound, review normalization,
gift-card validation, counters) would need a Node + Vitest/jsdom setup. See the
test-coverage analysis for the rationale and priority.
