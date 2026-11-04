const assert = require('node:assert/strict');
const { test } = require('node:test');
const { exportBackup, importBackup } = require('./backup');
const store = require('./store');
const { createMockRedis } = require('../test/mock-redis');

test('exportBackup includes created articles', async () => {
  const cmd = createMockRedis();
  await store.createArticle({ slug: 'export-test', title: 'Export', bodyHtml: '<p>e</p>' }, cmd);
  const backup = await exportBackup(cmd);
  assert.equal(backup.schemaVersion, 1);
  assert.equal(backup.articles.length, 1);
  assert.equal(backup.articles[0].slug, 'export-test');
});

test('importBackup skips slug conflicts when configured', async () => {
  const cmd = createMockRedis();
  await store.createArticle({ slug: 'taken', title: 'A', bodyHtml: '<p>a</p>' }, cmd);
  const backup = {
    schemaVersion: 1,
    articles: [
      {
        id: '00000000-0000-4000-8000-000000000099',
        slug: 'taken',
        title: 'B',
        bodyHtml: '<p>b</p>',
        status: 'draft',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        revision: 1,
        schemaVersion: 1
      }
    ]
  };
  const report = await importBackup(backup, { onSlugConflict: 'skip' }, cmd);
  assert.equal(report.skipped, 1);
  assert.equal(report.imported, 0);
});
