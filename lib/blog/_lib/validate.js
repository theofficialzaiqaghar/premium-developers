const { randomUUID } = require('node:crypto');
const {
  ARTICLE_STATUSES,
  QUALITY_STATUSES,
  DEFAULT_AUTHOR,
  MAX_ARTICLE_JSON_BYTES,
  MAX_SLUG_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MAX_META_DESCRIPTION_LENGTH,
  MAX_EXCERPT_LENGTH,
  MAX_KEYWORD_LENGTH,
  MAX_TAG_SLUG_LENGTH,
  MAX_CATEGORY_SLUG_LENGTH,
  SCHEMA_VERSION
} = require('./constants');
const { BlogError, CODES } = require('./errors');
const { sanitizeArticleHtml } = require('./sanitize');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function cleanString(value, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalizeSlug(raw) {
  const base = cleanString(raw, MAX_SLUG_LENGTH).toLowerCase();
  if (!base) return '';
  return base
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH);
}

function normalizeSlugSegment(raw, maxLength) {
  const slug = normalizeSlug(raw).slice(0, maxLength);
  if (!slug || !SLUG_SEGMENT_PATTERN.test(slug)) return '';
  return slug;
}

function uniqueStringList(values, maxItems, maxItemLength, normalizer) {
  if (!Array.isArray(values)) return [];
  const out = [];
  const seen = new Set();
  for (const item of values) {
    const normalized = normalizer(cleanString(item, maxItemLength));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
    if (out.length >= maxItems) break;
  }
  return out;
}

function assertStatus(status) {
  if (!ARTICLE_STATUSES.includes(status)) {
    throw new BlogError(CODES.VALIDATION, 'Invalid article status.', { status });
  }
}

function assertQualityStatus(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (!QUALITY_STATUSES.includes(value)) {
    throw new BlogError(CODES.VALIDATION, 'Invalid quality status.', { qualityStatus: value });
  }
  return value;
}

function validateSlug(slug, { required = true } = {}) {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    if (required) throw new BlogError(CODES.VALIDATION, 'URL slug is required.');
    return '';
  }
  if (normalized.length > MAX_SLUG_LENGTH || !SLUG_PATTERN.test(normalized)) {
    throw new BlogError(CODES.VALIDATION, 'URL slug must use lowercase letters, numbers, and hyphens only.');
  }
  return normalized;
}

function validateIsoDate(field, value, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) throw new BlogError(CODES.VALIDATION, `${field} is required.`);
    return null;
  }
  const text = cleanString(value, 40);
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) {
    throw new BlogError(CODES.VALIDATION, `${field} must be a valid ISO date.`, { field });
  }
  return new Date(ms).toISOString();
}

function validateLinkList(links, maxItems) {
  if (!Array.isArray(links)) return [];
  const out = [];
  for (const entry of links) {
    if (!entry || typeof entry !== 'object') continue;
    const href = cleanString(entry.href || entry.url, 2048);
    const anchor = cleanString(entry.anchor || entry.text, 200);
    if (!href) continue;
    let parsed;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) continue;
    out.push({ href: parsed.toString(), anchor: anchor || parsed.pathname });
    if (out.length >= maxItems) break;
  }
  return out;
}

function validateFeaturedImage(image) {
  if (!image || typeof image !== 'object') {
    return { url: '', alt: '', filename: '' };
  }
  return {
    url: cleanString(image.url, 2048),
    alt: cleanString(image.alt, 200),
    filename: cleanString(image.filename, 120)
  };
}

/**
 * Build a normalized article record for storage (create or replace fields).
 * @param {object} input
 * @param {{ existing?: object, partial?: boolean }} [options]
 */
function normalizeArticle(input, options = {}) {
  const existing = options.existing || null;
  const partial = Boolean(options.partial);
  const now = new Date().toISOString();

  const fieldErrors = {};

  const pick = (key, fallback) => {
    if (partial && !(key in input)) {
      return existing ? existing[key] : fallback;
    }
    return input[key] !== undefined ? input[key] : (existing ? existing[key] : fallback);
  };

  let slug;
  try {
    slug = validateSlug(pick('slug', ''), { required: !existing });
  } catch (err) {
    if (err instanceof BlogError && err.code === CODES.VALIDATION) fieldErrors.slug = err.message;
    else throw err;
  }

  let status = cleanString(pick('status', existing ? existing.status : 'draft'), 32).toLowerCase();
  try {
    assertStatus(status);
  } catch (err) {
    if (err instanceof BlogError) fieldErrors.status = err.message;
    else throw err;
  }

  let qualityStatus;
  try {
    qualityStatus = assertQualityStatus(pick('qualityStatus', existing ? existing.qualityStatus : ''));
  } catch (err) {
    if (err instanceof BlogError) fieldErrors.qualityStatus = err.message;
    else throw err;
  }

  const record = {
    schemaVersion: SCHEMA_VERSION,
    id: existing ? existing.id : cleanString(pick('id', ''), 36) || randomUUID(),
    slug: slug || (existing ? existing.slug : ''),
    status,
    qualityStatus,
    title: cleanString(pick('title', ''), MAX_TITLE_LENGTH),
    seoTitle: cleanString(pick('seoTitle', ''), MAX_SEO_TITLE_LENGTH),
    metaDescription: cleanString(pick('metaDescription', ''), MAX_META_DESCRIPTION_LENGTH),
    excerpt: cleanString(pick('excerpt', ''), MAX_EXCERPT_LENGTH),
    primaryKeyword: cleanString(pick('primaryKeyword', ''), MAX_KEYWORD_LENGTH),
    secondaryKeywords: uniqueStringList(
      pick('secondaryKeywords', []),
      20,
      MAX_KEYWORD_LENGTH,
      (v) => cleanString(v, MAX_KEYWORD_LENGTH).toLowerCase()
    ),
    searchIntent: cleanString(pick('searchIntent', ''), 80),
    categorySlugs: uniqueStringList(
      pick('categorySlugs', []),
      10,
      MAX_CATEGORY_SLUG_LENGTH,
      (v) => normalizeSlugSegment(v, MAX_CATEGORY_SLUG_LENGTH)
    ),
    tagSlugs: uniqueStringList(
      pick('tagSlugs', []),
      30,
      MAX_TAG_SLUG_LENGTH,
      (v) => normalizeSlugSegment(v, MAX_TAG_SLUG_LENGTH)
    ),
    featuredImage: validateFeaturedImage(pick('featuredImage', null)),
    bodyHtml: sanitizeArticleHtml(typeof pick('bodyHtml', '') === 'string' ? pick('bodyHtml', '') : ''),
    internalLinks: validateLinkList(pick('internalLinks', []), 25),
    externalLinks: validateLinkList(pick('externalLinks', []), 25),
    researchSummary: cleanString(pick('researchSummary', ''), 4000),
    author: cleanString(pick('author', DEFAULT_AUTHOR), 80) || DEFAULT_AUTHOR,
    revision: existing ? Number(existing.revision || 0) + (partial ? 0 : 1) : 1,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    scheduledAt: null,
    publishedAt: null
  };

  try {
    record.scheduledAt = validateIsoDate('scheduledAt', pick('scheduledAt', existing ? existing.scheduledAt : null));
  } catch (err) {
    if (err instanceof BlogError) fieldErrors.scheduledAt = err.message;
    else throw err;
  }

  try {
    record.publishedAt = validateIsoDate('publishedAt', pick('publishedAt', existing ? existing.publishedAt : null));
  } catch (err) {
    if (err instanceof BlogError) fieldErrors.publishedAt = err.message;
    else throw err;
  }

  if (existing && partial) {
    record.revision = Number(existing.revision || 1);
    record.createdAt = existing.createdAt;
    record.updatedAt = now;
    if (!('status' in input)) record.status = existing.status;
    if (partial && !('slug' in input)) record.slug = existing.slug;
  }

  if (status === 'published' && !record.publishedAt) {
    fieldErrors.publishedAt = 'publishedAt is required when status is published.';
  }
  if (status === 'scheduled' && !record.scheduledAt) {
    fieldErrors.scheduledAt = 'scheduledAt is required when status is scheduled.';
  }

  if (Object.keys(fieldErrors).length) {
    throw new BlogError(CODES.VALIDATION, 'Article validation failed.', { fieldErrors });
  }

  const json = JSON.stringify(record);
  if (Buffer.byteLength(json, 'utf8') > MAX_ARTICLE_JSON_BYTES) {
    throw new BlogError(
      CODES.PAYLOAD_TOO_LARGE,
      'Article exceeds the maximum storage size for a single record.',
      { maxBytes: MAX_ARTICLE_JSON_BYTES }
    );
  }

  return record;
}

function parseStoredArticle(raw) {
  if (!raw) return null;
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new BlogError(CODES.VALIDATION, 'Stored article JSON is invalid.');
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.id) {
    throw new BlogError(CODES.VALIDATION, 'Stored article is missing required fields.');
  }
  return parsed;
}

module.exports = {
  cleanString,
  normalizeSlug,
  normalizeSlugSegment,
  validateSlug,
  normalizeArticle,
  parseStoredArticle,
  assertStatus,
  ARTICLE_STATUSES
};
