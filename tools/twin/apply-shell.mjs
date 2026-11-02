// Shared page shell for jmassageslc.com (Elite twin design, 2026-11-02).
// Usage: node tools/twin/apply-shell.mjs <page.html> [...]
// Puts the canonical header, footer and phone Book/Call bar from tools/twin/shell.html on each page,
// points <head> at /css/site.css, and swaps the old motion scripts for nav.js + defer-load.js.
// It never touches <title>, meta, canonical, JSON-LD, <main> or tracking tags. Safe to run again:
// edit shell.html, then rerun it on every page to change the nav or footer site-wide.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shell = readFileSync(join(here, 'shell.html'), 'utf8');
const part = (name) => shell.split(`<!--@@${name}-->`)[1].split('<!--@@')[0].replace(/\s+$/, '');
const HEADER = part('header');
const FOOTER = part('footer');
const MCTA = part('mcta');
const CSS = '<link rel="stylesheet" href="/css/site.css?v=1">';
const NAV_JS = '<script src="/js/nav.js?v=1" defer></script>';

function apply(html) {
  const nl = html.includes('\r\n') ? '\r\n' : '\n';
  const lf = (s) => s.replace(/\r?\n/g, nl);
  const hadCta = /<nav class="m-cta"/.test(html);
  let h = html;

  // Head: the intro-cover pre-paint script (removed with the intro), the old stylesheets.
  h = h.replace(/[ \t]*<!-- Runs before any stylesheet[^>]*-->\s*<script>(?:(?!<\/script>)[\s\S])*cine-pending[\s\S]*?<\/script>\r?\n/, '');
  h = h.replace(/<link rel="stylesheet" href="(?:\.\.\/|\/)?css\/styles\.css\?v=\d+">/, CSS);
  h = h.replace(/[ \t]*<link rel="stylesheet" href="(?:\.\.\/|\/)?css\/service-page\.css[^"]*">\r?\n/, '');

  // Body chrome.
  h = h.replace(/[ \t]*<div class="cursor-glow"[^>]*><\/div>\r?\n/, '');
  const header = /[ \t]*<header id="header" class="header">[\s\S]*?<\/header>|[ \t]*<header class="site-header">[\s\S]*?<\/header>/;
  if (header.test(h)) h = h.replace(header, lf(HEADER));
  else h = h.replace(/(<a [^>]*class="skip-link"[^>]*>[^<]*<\/a>\r?\n|<body[^>]*>\r?\n)/, `$1${lf(HEADER)}${nl}`);
  const footer = /[ \t]*<footer class="footer">[\s\S]*?<\/footer>|[ \t]*<footer class="site-footer">[\s\S]*?<\/footer>/;
  if (footer.test(h)) h = h.replace(footer, lf(FOOTER));
  else h = h.replace(/(<\/main>\r?\n)/, `$1${nl}${lf(FOOTER)}${nl}`);

  // Phone bar: old inline style block out, canonical bar in (only where the page already had one).
  h = h.replace(/[ \t]*<!-- Sticky mobile Book\/Call bar[^>]*-->\s*<style>[\s\S]*?<\/style>\r?\n/, '');
  if (hadCta) h = h.replace(/[ \t]*<nav class="m-cta"[\s\S]*?<\/nav>/, lf(MCTA));

  // Scripts: old motion stack out; nav.js + defer-load (motion moves into defer-load) in.
  h = h.replace(/[ \t]*<script src="(?:\.\.\/|\/)?js\/(?:vendor\/(?:gsap|ScrollTrigger|lenis)\.min\.js|main\.js|motion\.js|service-page\.js)[^"]*"[^>]*><\/script>\r?\n/g, '');
  h = h.replace(/\/js\/defer-load\.js\?v=1/g, '/js/defer-load.js?v=2');
  if (!h.includes('/js/nav.js')) {
    if (/<script src="\/js\/defer-load\.js/.test(h)) h = h.replace(/([ \t]*)(<script src="\/js\/defer-load\.js)/, `$1${NAV_JS}${nl}$1$2`);
    else h = h.replace(/([ \t]*)<\/body>/, `  ${NAV_JS}${nl}$1</body>`);
  }
  return h;
}

for (const f of process.argv.slice(2)) {
  const before = readFileSync(f, 'utf8');
  const after = apply(before);
  if (after !== before) writeFileSync(f, after);
  console.log(`${after === before ? 'unchanged' : 'shell applied'}: ${f}`);
}
