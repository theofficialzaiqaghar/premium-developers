const assert = require('node:assert/strict');
const { test } = require('node:test');
const { normalizeSlug, normalizeArticle, validateSlug } = require('./validate');
const { BlogError, CODES } = require('./errors');

test('normalizeSlug lowercases and hyphenates', () => {
  assert.equal(normalizeSlug('  Hello World! SEO  '), 'hello-world-seo');
});

test('validateSlug rejects empty slug', () => {
  assert.throws(() => validateSlug('   '), (err) => err instanceof BlogError && err.code === CODES.VALIDATION);
});

test('normalizeArticle requires scheduledAt when scheduled', () => {
  assert.throws(
    () =>
      normalizeArticle({
        slug: 'test-post',
        status: 'scheduled',
        title: 'T',
        bodyHtml: '<p>x</p>'
      }),
    (err) =>
      err instanceof BlogError &&
      err.details?.fieldErrors?.scheduledAt === 'scheduledAt is required when status is scheduled.'
  );
});

test('normalizeArticle defaults new records to draft', () => {
  const article = normalizeArticle({
    slug: 'my-post',
    title: 'Title',
    bodyHtml: '<p>Body</p>'
  });
  assert.equal(article.status, 'draft');
  assert.match(article.id, /^[0-9a-f-]{36}$/i);
});
