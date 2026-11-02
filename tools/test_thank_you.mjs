// Unit tests for the /thank-you conversion snippet (thank-you.html), 2026-11-01.
// Run: node --test tools/test_thank_you.mjs   (from the repo root)
// Never test this by loading /thank-you in a browser: it fires the real conversion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const HTML = readFileSync(new URL('../thank-you.html', import.meta.url), 'utf8');
const SRC = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes("'conversion'"));
const ORDER = '3f2b8c1e-5d4a-4e7b-9c2d-1a6f0e8b7c55';

function load(search = '', stored = {}) {
  const calls = [], m = new Map(Object.entries(stored));
  const context = { gtag: (...a) => calls.push(JSON.parse(JSON.stringify(a))), location: { search }, URLSearchParams,
    document: { readyState: 'complete' }, localStorage: { getItem: (k) => m.get(k) ?? null, removeItem: (k) => m.delete(k) } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(SRC, context);
  return calls;
}
const conv = (calls) => calls.find((c) => c[1] === 'conversion')[2];

test('calendar booking: value from the redirect, no order id (unchanged)', () => {
  const c = conv(load('?value=105'));
  assert.equal(c.value, 105);
  assert.equal(c.transaction_id, undefined);
});
test('online cart order: the order id is the transaction_id on every event', () => {
  const calls = load(`?order=${ORDER}&value=1450`);
  assert.deepEqual(conv(calls), { send_to: 'AW-18046916928/xnG9CK-j4O4cEMCyuJ1D', value: 1450, currency: 'USD', transaction_id: ORDER });
  assert.equal(calls.find((c) => c[1] === 'booking_complete')[2].transaction_id, ORDER);
});
test('values up to 5000 are sent (the largest cart is about 3630); above is dropped', () => {
  assert.equal(conv(load(`?order=${ORDER}&value=3630`)).value, 3630);
  assert.equal(conv(load('?value=5000')).value, 5000);
  assert.equal(conv(load('?value=5001')).value, undefined);
});
test('a cart order never falls back to a stored calendar price', () => {
  assert.equal(conv(load(`?order=${ORDER}&value=9999`, { jm_book_value: '105' })).value, undefined);
});
test('a malformed order id is ignored', () => {
  assert.equal(conv(load('?order=<x>&value=100')).transaction_id, undefined);
});
