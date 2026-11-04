/** Blog CMS Redis schema version (increment on breaking layout changes). */
const SCHEMA_VERSION = 1;

const KEY_PREFIX = 'blog:';

/** Article workflow statuses — never auto-publish from automation alone. */
const ARTICLE_STATUSES = Object.freeze([
  'researching',
  'generated',
  'draft',
  'in_review',
  'approved',
  'scheduled',
  'published',
  'rejected',
  'failed'
]);

const QUALITY_STATUSES = Object.freeze(['pass', 'needs_review', 'rejected']);

const DEFAULT_AUTHOR = 'Premium Developers';

/** Keep each stored JSON under Upstash free-tier request limit (10 MB). */
const MAX_ARTICLE_JSON_BYTES = 9 * 1024 * 1024;

const MAX_SLUG_LENGTH = 80;
const MAX_TITLE_LENGTH = 200;
const MAX_SEO_TITLE_LENGTH = 70;
const MAX_META_DESCRIPTION_LENGTH = 320;
const MAX_EXCERPT_LENGTH = 500;
const MAX_KEYWORD_LENGTH = 80;
const MAX_TAG_SLUG_LENGTH = 60;
const MAX_CATEGORY_SLUG_LENGTH = 60;
const MAX_HISTORY_ENTRIES = 50;

module.exports = {
  SCHEMA_VERSION,
  KEY_PREFIX,
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
  MAX_HISTORY_ENTRIES
};
