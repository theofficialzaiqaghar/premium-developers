const { SCHEMA_VERSION } = require('./constants');
const keys = require('./keys');
const { redisCommand } = require('./redis');
const { BlogError, CODES } = require('./errors');
const { parseStoredArticle, normalizeSlug } = require('./validate');
const store = require('./store');

function backupDocumentMeta() {
  return {
    generator: 'premium-developers-blog-cms',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString()
  };
}

/**
 * Export all blog-prefixed indexes and articles for offline backup.
 * Uses article index keys rather than Redis SCAN (not exposed on REST the same way).
 */
async function exportBackup(command = redisCommand) {
  await store.ensureSchemaVersion(command);

  const schemaVersion = await command(['GET', keys.metaSchemaVersion()]);
  const articleIds = await command(['ZRANGE', keys.articlesByUpdated(), '0', '-1']);
  const articles = [];

  if (Array.isArray(articleIds)) {
    for (const id of articleIds) {
      const raw = await command(['GET', keys.article(id)]);
      if (!raw) continue;
      articles.push(parseStoredArticle(raw));
    }
  }

  const categorySlugs = await command(['SMEMBERS', keys.categoriesAll()]);
  const categories = [];
  if (Array.isArray(categorySlugs)) {
    for (const slug of categorySlugs) {
      const raw = await command(['GET', keys.category(slug)]);
      if (raw) {
        try {
          categories.push(JSON.parse(raw));
        } catch {
          /* skip corrupt */
        }
      }
    }
  }

  const tagSlugs = await command(['SMEMBERS', keys.tagsAll()]);
  const tags = [];
  if (Array.isArray(tagSlugs)) {
    for (const slug of tagSlugs) {
      const raw = await command(['GET', keys.tag(slug)]);
      if (raw) {
        try {
          tags.push(JSON.parse(raw));
        } catch {
          /* skip corrupt */
        }
      }
    }
  }

  const payload = {
    ...backupDocumentMeta(),
    schemaVersion: Number(schemaVersion) || SCHEMA_VERSION,
    counts: {
      articles: articles.length,
      categories: categories.length,
      tags: tags.length
    },
    articles,
    categories,
    tags
  };

  await command([
    'SET',
    keys.backupManifest(),
    JSON.stringify({
      exportedAt: payload.exportedAt,
      counts: payload.counts
    })
  ]);

  return payload;
}

/**
 * Import articles from a backup JSON object.
 * @param {object} backup
 * @param {{ onSlugConflict?: 'skip'|'fail' }} [options]
 */
async function importBackup(backup, options = {}, command = redisCommand) {
  if (!backup || typeof backup !== 'object') {
    throw new BlogError(CODES.BACKUP_INVALID, 'Backup payload must be an object.');
  }
  if (!Array.isArray(backup.articles)) {
    throw new BlogError(CODES.BACKUP_INVALID, 'Backup must include an articles array.');
  }
  const version = Number(backup.schemaVersion);
  if (!Number.isInteger(version) || version > SCHEMA_VERSION) {
    throw new BlogError(CODES.BACKUP_INVALID, 'Unsupported backup schema version.', { schemaVersion: backup.schemaVersion });
  }

  const onSlugConflict = options.onSlugConflict === 'skip' ? 'skip' : 'fail';
  const report = { imported: 0, skipped: 0, errors: [] };

  for (const entry of backup.articles) {
    try {
      const article = parseStoredArticle(entry);
      const slug = normalizeSlug(article.slug);
      if (!slug) {
        report.skipped += 1;
        report.errors.push({ id: article.id, reason: 'invalid_slug' });
        continue;
      }

      const available = await store.slugAvailable(slug, { excludeArticleId: article.id }, command);
      const existing = await store.getArticleById(article.id, command);

      if (!available && !existing) {
        if (onSlugConflict === 'skip') {
          report.skipped += 1;
          report.errors.push({ id: article.id, slug, reason: 'slug_conflict' });
          continue;
        }
        throw new BlogError(CODES.IMPORT_CONFLICT, 'Slug conflict during import.', { slug, id: article.id });
      }

      if (existing) {
        await store.updateArticle(article.id, article, command);
      } else {
        await store.createArticle(article, command);
      }
      report.imported += 1;
    } catch (err) {
      if (onSlugConflict === 'skip' && err instanceof BlogError) {
        report.skipped += 1;
        report.errors.push({ reason: err.code, message: err.message });
        continue;
      }
      throw err;
    }
  }

  return report;
}

module.exports = {
  backupDocumentMeta,
  exportBackup,
  importBackup
};
