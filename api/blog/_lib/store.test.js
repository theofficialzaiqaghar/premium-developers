const assert = require('node:assert/strict');
const { test } = require('node:test');
const store = require('./store');
const keys = require('./keys');
const { BlogError, CODES } = require('./errors');
const { createMockRedis } = require('./test/mock-redis');

const ARTICLE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';

test('createArticle enforces unique slug', async () => {
  const cmd = createMockRedis();
  await store.createArticle(
    { id: ARTICLE_ID, slug: 'first-post', title: 'One', bodyHtml: '<p>1</p>' },
    cmd
  );
  await assert.rejects(
    () => store.createArticle({ slug: 'first-post', title: 'Two', bodyHtml: '<p>2</p>' }, cmd),
    (err) => err instanceof BlogError && err.code === CODES.SLUG_EXISTS
  );
});

test('getArticleBySlug resolves slug index', async () => {
  const cmd = createMockRedis();
  await store.createArticle(
    { id: ARTICLE_ID, slug: 'seo-tips', title: 'SEO', bodyHtml: '<p>x</p>' },
    cmd
  );
  const found = await store.getArticleBySlug('seo-tips', cmd);
  assert.equal(found.id, ARTICLE_ID);
});

test('updateArticle changes slug and bumps revision', async () => {
  const cmd = createMockRedis();
  await store.createArticle(
    { id: ARTICLE_ID, slug: 'old-slug', title: 'T', bodyHtml: '<p>b</p>' },
    cmd
  );
  const updated = await store.updateArticle(
    ARTICLE_ID,
    { slug: 'new-slug', title: 'Updated' },
    cmd
  );
  assert.equal(updated.slug, 'new-slug');
  assert.equal(updated.revision, 2);
  assert.equal(await store.getArticleBySlug('old-slug', cmd), null);
  assert.equal((await store.getArticleBySlug('new-slug', cmd)).title, 'Updated');
});

test('deleteArticle removes slug mapping', async () => {
  const cmd = createMockRedis();
  await store.createArticle(
    { id: ARTICLE_ID, slug: 'remove-me', title: 'T', bodyHtml: '<p>b</p>' },
    cmd
  );
  await store.deleteArticle(ARTICLE_ID, cmd);
  assert.equal(await store.getArticleById(ARTICLE_ID, cmd), null);
  assert.equal(await cmd(['GET', keys.slugIndex('remove-me')]), null);
});

test('publish requires publishedAt', async () => {
  const cmd = createMockRedis();
  await store.createArticle(
    { id: ARTICLE_ID, slug: 'pub', title: 'T', bodyHtml: '<p>b</p>' },
    cmd
  );
  await assert.rejects(
    () => store.updateArticle(ARTICLE_ID, { status: 'published' }, cmd),
    (err) => err instanceof BlogError && err.code === CODES.VALIDATION
  );
});
