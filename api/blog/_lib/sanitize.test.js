const assert = require('node:assert/strict');
const { test } = require('node:test');
const { sanitizeArticleHtml } = require('./sanitize');

test('removes script tags and event handlers', () => {
  const out = sanitizeArticleHtml('<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1)>');
  assert.match(out, /<p>Hi<\/p>/);
  assert.doesNotMatch(out, /script/i);
  assert.doesNotMatch(out, /onerror/i);
});

test('blocks javascript URLs in links', () => {
  const out = sanitizeArticleHtml('<a href="javascript:alert(1)">x</a><a href="https://example.com">ok</a>');
  assert.doesNotMatch(out, /javascript:/);
  assert.match(out, /href="https:\/\/example.com"/);
});

test('removes iframe embeds', () => {
  const out = sanitizeArticleHtml('<iframe src="https://evil.com"></iframe><p>safe</p>');
  assert.doesNotMatch(out, /iframe/i);
  assert.match(out, /safe/);
});

test('allows tables and headings', () => {
  const out = sanitizeArticleHtml('<h2>Title</h2><table><tr><td>Cell</td></tr></table>');
  assert.match(out, /<h2>Title<\/h2>/);
  assert.match(out, /<table>/);
});
