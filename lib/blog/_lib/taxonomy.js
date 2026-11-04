const keys = require('./keys');
const { redisCommand } = require('./redis');
const { BlogError, CODES } = require('./errors');
const { normalizeSlugSegment, cleanString } = require('./validate');
const { MAX_CATEGORY_SLUG_LENGTH, MAX_TAG_SLUG_LENGTH } = require('./constants');

function normalizeCategory(input) {
  const name = cleanString(input.name, 120);
  const slug = normalizeSlugSegment(input.slug || name, MAX_CATEGORY_SLUG_LENGTH);
  const description = cleanString(input.description, 500);
  if (!slug) throw new BlogError(CODES.VALIDATION, 'Category slug is invalid.', { fieldErrors: { slug: 'Invalid slug.' } });
  if (!name) throw new BlogError(CODES.VALIDATION, 'Category name is required.', { fieldErrors: { name: 'Required.' } });
  const now = new Date().toISOString();
  return { slug, name, description, updatedAt: now };
}

function normalizeTag(input) {
  const name = cleanString(input.name, 80);
  const slug = normalizeSlugSegment(input.slug || name, MAX_TAG_SLUG_LENGTH);
  if (!slug) throw new BlogError(CODES.VALIDATION, 'Tag slug is invalid.', { fieldErrors: { slug: 'Invalid slug.' } });
  if (!name) throw new BlogError(CODES.VALIDATION, 'Tag name is required.', { fieldErrors: { name: 'Required.' } });
  const now = new Date().toISOString();
  return { slug, name, updatedAt: now };
}

async function listCategories(command = redisCommand) {
  const slugs = await command(['SMEMBERS', keys.categoriesAll()]);
  if (!Array.isArray(slugs) || !slugs.length) return [];
  const items = [];
  for (const slug of slugs.sort()) {
    const raw = await command(['GET', keys.category(slug)]);
    if (raw) {
      try {
        items.push(JSON.parse(raw));
      } catch {
        /* skip */
      }
    }
  }
  return items;
}

async function upsertCategory(input, command = redisCommand) {
  const record = normalizeCategory(input);
  const existingRaw = await command(['GET', keys.category(record.slug)]);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      record.createdAt = existing.createdAt || record.updatedAt;
    } catch {
      record.createdAt = record.updatedAt;
    }
  } else {
    record.createdAt = record.updatedAt;
    await command(['SADD', keys.categoriesAll(), record.slug]);
  }
  await command(['SET', keys.category(record.slug), JSON.stringify(record)]);
  return record;
}

async function deleteCategory(slug, command = redisCommand) {
  const normalized = normalizeSlugSegment(slug, MAX_CATEGORY_SLUG_LENGTH);
  if (!normalized) throw new BlogError(CODES.VALIDATION, 'Invalid category slug.');
  const raw = await command(['GET', keys.category(normalized)]);
  if (!raw) throw new BlogError(CODES.NOT_FOUND, 'Category not found.');
  await command(['DEL', keys.category(normalized)]);
  await command(['SREM', keys.categoriesAll(), normalized]);
  return { slug: normalized, deleted: true };
}

async function listTags(command = redisCommand) {
  const slugs = await command(['SMEMBERS', keys.tagsAll()]);
  if (!Array.isArray(slugs) || !slugs.length) return [];
  const items = [];
  for (const slug of slugs.sort()) {
    const raw = await command(['GET', keys.tag(slug)]);
    if (raw) {
      try {
        items.push(JSON.parse(raw));
      } catch {
        /* skip */
      }
    }
  }
  return items;
}

async function upsertTag(input, command = redisCommand) {
  const record = normalizeTag(input);
  const existingRaw = await command(['GET', keys.tag(record.slug)]);
  if (existingRaw) {
    try {
      const existing = JSON.parse(existingRaw);
      record.createdAt = existing.createdAt || record.updatedAt;
    } catch {
      record.createdAt = record.updatedAt;
    }
  } else {
    record.createdAt = record.updatedAt;
    await command(['SADD', keys.tagsAll(), record.slug]);
  }
  await command(['SET', keys.tag(record.slug), JSON.stringify(record)]);
  return record;
}

async function deleteTag(slug, command = redisCommand) {
  const normalized = normalizeSlugSegment(slug, MAX_TAG_SLUG_LENGTH);
  if (!normalized) throw new BlogError(CODES.VALIDATION, 'Invalid tag slug.');
  const raw = await command(['GET', keys.tag(normalized)]);
  if (!raw) throw new BlogError(CODES.NOT_FOUND, 'Tag not found.');
  await command(['DEL', keys.tag(normalized)]);
  await command(['SREM', keys.tagsAll(), normalized]);
  return { slug: normalized, deleted: true };
}

module.exports = {
  listCategories,
  upsertCategory,
  deleteCategory,
  listTags,
  upsertTag,
  deleteTag
};
