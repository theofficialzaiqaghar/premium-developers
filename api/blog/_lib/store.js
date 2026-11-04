const { SCHEMA_VERSION, MAX_HISTORY_ENTRIES } = require('./constants');
const keys = require('./keys');
const { redisCommand, isConfigured, ping } = require('./redis');
const { BlogError, CODES } = require('./errors');
const { normalizeArticle, parseStoredArticle, validateSlug } = require('./validate');
const { CREATE_ARTICLE, UPDATE_ARTICLE, DELETE_ARTICLE } = require('./scripts');

function scoreFromIso(iso) {
  const ms = Date.parse(iso || '');
  return Number.isFinite(ms) ? ms : Date.now();
}

function publishedScore(record) {
  return scoreFromIso(record.publishedAt || record.updatedAt);
}

async function ensureSchemaVersion(command = redisCommand) {
  const current = await command(['GET', keys.metaSchemaVersion()]);
  if (current === null || current === undefined) {
    await command(['SET', keys.metaSchemaVersion(), String(SCHEMA_VERSION)]);
    return SCHEMA_VERSION;
  }
  const version = Number(current);
  if (!Number.isInteger(version) || version > SCHEMA_VERSION) {
    throw new BlogError(CODES.BACKUP_INVALID, 'Unsupported blog schema version in Redis.', { version: current });
  }
  if (version < SCHEMA_VERSION) {
    await command(['SET', keys.metaSchemaVersion(), String(SCHEMA_VERSION)]);
  }
  return SCHEMA_VERSION;
}

async function appendHistory(articleId, snapshot, command = redisCommand) {
  const key = keys.articleHistory(articleId);
  await command(['LPUSH', key, JSON.stringify(snapshot)]);
  await command(['LTRIM', key, 0, MAX_HISTORY_ENTRIES - 1]);
}

async function getArticleById(id, command = redisCommand) {
  const raw = await command(['GET', keys.article(id)]);
  return raw ? parseStoredArticle(raw) : null;
}

async function getArticleBySlug(slug, command = redisCommand) {
  const normalized = validateSlug(slug);
  const id = await command(['GET', keys.slugIndex(normalized)]);
  if (!id) return null;
  return getArticleById(id, command);
}

async function createArticle(input, command = redisCommand) {
  await ensureSchemaVersion(command);
  const record = normalizeArticle(input);
  const score = scoreFromIso(record.updatedAt);
  const pubScore = publishedScore(record);

  const result = await command([
    'EVAL',
    CREATE_ARTICLE,
    5,
    keys.slugIndex(record.slug),
    keys.article(record.id),
    keys.articlesByUpdated(),
    keys.articlesByStatus(record.status),
    keys.articlesPublished(),
    record.id,
    JSON.stringify(record),
    String(score),
    record.status,
    String(pubScore)
  ]);

  if (result === 'SLUG_EXISTS') {
    throw new BlogError(CODES.SLUG_EXISTS, 'An article with this URL slug already exists.', { slug: record.slug });
  }
  if (result !== 'OK') {
    throw new BlogError(CODES.REDIS, 'Failed to create article.', { result });
  }

  await appendHistory(record.id, { ...record, historyNote: 'created' }, command);
  return record;
}

async function updateArticle(id, input, command = redisCommand) {
  await ensureSchemaVersion(command);
  const existing = await getArticleById(id, command);
  if (!existing) {
    throw new BlogError(CODES.NOT_FOUND, 'Article not found.', { id });
  }

  await appendHistory(id, { ...existing, historyNote: 'before_update' }, command);

  const record = normalizeArticle(input, { existing, partial: true });
  record.id = existing.id;
  record.revision = Number(existing.revision || 1) + 1;
  record.createdAt = existing.createdAt;

  if (input.status === 'published' && !record.publishedAt) {
    throw new BlogError(CODES.VALIDATION, 'Cannot publish without publishedAt (manual publish only).', {
      fieldErrors: { publishedAt: 'Set publishedAt when changing status to published.' }
    });
  }

  const score = scoreFromIso(record.updatedAt);
  const pubScore = publishedScore(record);

  const result = await command([
    'EVAL',
    UPDATE_ARTICLE,
    7,
    keys.slugIndex(record.slug),
    keys.article(record.id),
    keys.articlesByUpdated(),
    keys.articlesByStatus(existing.status),
    keys.articlesByStatus(record.status),
    keys.articlesPublished(),
    keys.slugIndex(existing.slug),
    record.id,
    record.slug,
    existing.slug,
    JSON.stringify(record),
    String(score),
    existing.status,
    record.status,
    String(pubScore)
  ]);

  if (result === 'SLUG_EXISTS') {
    throw new BlogError(CODES.SLUG_EXISTS, 'An article with this URL slug already exists.', { slug: record.slug });
  }
  if (result !== 'OK') {
    throw new BlogError(CODES.REDIS, 'Failed to update article.', { result });
  }

  return record;
}

async function deleteArticle(id, command = redisCommand) {
  const existing = await getArticleById(id, command);
  if (!existing) {
    throw new BlogError(CODES.NOT_FOUND, 'Article not found.', { id });
  }

  const result = await command([
    'EVAL',
    DELETE_ARTICLE,
    6,
    keys.slugIndex(existing.slug),
    keys.article(id),
    keys.articlesByUpdated(),
    keys.articlesByStatus(existing.status),
    keys.articlesPublished(),
    keys.articleHistory(id),
    id,
    existing.slug
  ]);

  if (result === 'NOT_FOUND') {
    throw new BlogError(CODES.NOT_FOUND, 'Article not found.', { id });
  }
  if (result !== 'OK') {
    throw new BlogError(CODES.REDIS, 'Failed to delete article.', { result });
  }

  return { id, deleted: true };
}

/**
 * @param {{ status?: string, offset?: number, limit?: number }} [query]
 */
async function listArticles(query = {}, command = redisCommand) {
  await ensureSchemaVersion(command);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const status = query.status ? String(query.status).toLowerCase() : '';

  const indexKey = status ? keys.articlesByStatus(status) : keys.articlesByUpdated();
  const end = offset + limit - 1;
  const ids = await command(['ZREVRANGE', indexKey, String(offset), String(end)]);
  if (!Array.isArray(ids) || !ids.length) {
    return { items: [], offset, limit, total: null };
  }

  const items = [];
  for (const articleId of ids) {
    const article = await getArticleById(articleId, command);
    if (article) items.push(article);
  }

  return { items, offset, limit, total: null };
}

function matchesSearch(article, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;
  const haystack = `${article.title || ''} ${article.slug || ''} ${article.seoTitle || ''}`.toLowerCase();
  return haystack.includes(q);
}

/**
 * Admin list with optional status filter and title/slug search (in-memory filter on index page).
 */
async function searchArticles(query = {}, command = redisCommand) {
  const search = query.search || query.q || '';
  const status = query.status ? String(query.status).toLowerCase() : '';
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);

  const indexKey = status ? keys.articlesByStatus(status) : keys.articlesByUpdated();
  const scanSize = Math.min(Math.max(offset + limit + 200, 100), 1000);
  const ids = await command(['ZREVRANGE', indexKey, '0', String(scanSize - 1)]);

  const filtered = [];
  if (Array.isArray(ids)) {
    for (const articleId of ids) {
      const article = await getArticleById(articleId, command);
      if (!article) continue;
      if (status && article.status !== status) continue;
      if (!matchesSearch(article, search)) continue;
      filtered.push(article);
    }
  }

  return {
    items: filtered.slice(offset, offset + limit),
    offset,
    limit,
    total: filtered.length
  };
}

async function listPublishedArticles(query = {}, command = redisCommand) {
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  const end = offset + limit - 1;
  const ids = await command(['ZREVRANGE', keys.articlesPublished(), String(offset), String(end)]);
  const items = [];
  if (Array.isArray(ids)) {
    for (const articleId of ids) {
      const article = await getArticleById(articleId, command);
      if (article && article.status === 'published') items.push(article);
    }
  }
  return { items, offset, limit };
}

async function listPublishedSlugs(command = redisCommand) {
  const ids = await command(['ZREVRANGE', keys.articlesPublished(), '0', '-1']);
  if (!Array.isArray(ids) || !ids.length) return [];
  const slugs = [];
  for (const id of ids) {
    const article = await getArticleById(id, command);
    if (article && article.status === 'published') slugs.push(article.slug);
  }
  return slugs;
}

async function getArticleHistory(id, command = redisCommand) {
  const rawList = await command(['LRANGE', keys.articleHistory(id), '0', String(MAX_HISTORY_ENTRIES - 1)]);
  if (!Array.isArray(rawList)) return [];
  return rawList.map((raw) => parseStoredArticle(raw)).filter(Boolean);
}

async function slugAvailable(slug, { excludeArticleId } = {}, command = redisCommand) {
  const normalized = validateSlug(slug);
  const owner = await command(['GET', keys.slugIndex(normalized)]);
  if (!owner) return true;
  if (excludeArticleId && owner === excludeArticleId) return true;
  return false;
}

module.exports = {
  isConfigured,
  ping,
  ensureSchemaVersion,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticleById,
  getArticleBySlug,
  listArticles,
  searchArticles,
  listPublishedArticles,
  listPublishedSlugs,
  getArticleHistory,
  slugAvailable
};
