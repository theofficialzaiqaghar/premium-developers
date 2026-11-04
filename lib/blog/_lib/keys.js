const { KEY_PREFIX } = require('./constants');

function metaSchemaVersion() {
  return `${KEY_PREFIX}meta:schema_version`;
}

function slugIndex(slug) {
  return `${KEY_PREFIX}slug:${slug}`;
}

function article(id) {
  return `${KEY_PREFIX}article:${id}`;
}

function articlesByUpdated() {
  return `${KEY_PREFIX}articles:by_updated`;
}

function articlesByStatus(status) {
  return `${KEY_PREFIX}articles:by_status:${status}`;
}

function articlesPublished() {
  return `${KEY_PREFIX}articles:published`;
}

function category(slug) {
  return `${KEY_PREFIX}category:${slug}`;
}

function categoriesAll() {
  return `${KEY_PREFIX}categories:all`;
}

function tag(slug) {
  return `${KEY_PREFIX}tag:${slug}`;
}

function tagsAll() {
  return `${KEY_PREFIX}tags:all`;
}

function articleHistory(articleId) {
  return `${KEY_PREFIX}history:${articleId}`;
}

function backupManifest() {
  return `${KEY_PREFIX}backup:manifest`;
}

/** Keys owned by this CMS — safe prefix for SCAN-style export (documented; use indexes in code). */
function allKeyPrefix() {
  return KEY_PREFIX;
}

module.exports = {
  metaSchemaVersion,
  slugIndex,
  article,
  articlesByUpdated,
  articlesByStatus,
  articlesPublished,
  category,
  categoriesAll,
  tag,
  tagsAll,
  articleHistory,
  backupManifest,
  allKeyPrefix
};
