const { BlogError, CODES } = require('./errors');

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'h2',
  'h3',
  'h4',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'hr',
  'pre',
  'code',
  'span',
  'div'
]);

const GLOBAL_ATTRS = new Set(['id', 'class', 'title', 'aria-label']);
const TAG_ATTRS = {
  a: new Set(['href', 'rel', 'target']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
  div: new Set([]),
  span: new Set([])
};

const TAG_RE = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9_:\-.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function isSafeUrl(value, { forImage = false } = {}) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return false;
  if (lower.startsWith('data:') && !forImage) return false;
  if (lower.startsWith('data:') && forImage && !lower.startsWith('data:image/')) return false;
  if (/^[\u0000-\u001f\u007f]/.test(trimmed)) return false;
  if (trimmed.startsWith('//')) return false;
  if (trimmed.startsWith('/')) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

function allowedAttr(tag, name) {
  const lower = name.toLowerCase();
  if (lower.startsWith('on')) return false;
  if (lower === 'style') return false;
  if (lower === 'formaction') return false;
  if (GLOBAL_ATTRS.has(lower)) return true;
  const tagSet = TAG_ATTRS[tag];
  return tagSet ? tagSet.has(lower) : false;
}

function sanitizeAttrs(tag, attrString) {
  const attrs = [];
  if (!attrString) return '';
  let match;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    const name = match[1];
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    const tagName = tag.toLowerCase();
    const attrName = name.toLowerCase();
    if (!allowedAttr(tagName, attrName)) continue;
    if (attrName === 'href' && !isSafeUrl(value)) continue;
    if (attrName === 'src' && !isSafeUrl(value, { forImage: true })) continue;
    if (attrName === 'target' && value !== '_blank') continue;
    if (attrName === 'rel' && !/^(noopener|noreferrer|nofollow)(\s+(noopener|noreferrer|nofollow))*$/i.test(value)) {
      attrs.push('rel="noopener noreferrer"');
      continue;
    }
    const escaped = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    attrs.push(`${attrName}="${escaped}"`);
  }
  if (tag.toLowerCase() === 'a' && attrs.some((a) => a.startsWith('target=')) && !attrs.some((a) => a.startsWith('rel='))) {
    attrs.push('rel="noopener noreferrer"');
  }
  return attrs.length ? ` ${attrs.join(' ')}` : '';
}

function sanitizeArticleHtml(html) {
  if (html === undefined || html === null) return '';
  if (typeof html !== 'string') {
    throw new BlogError(CODES.VALIDATION, 'Article body must be HTML text.', {
      fieldErrors: { bodyHtml: 'Invalid body HTML.' }
    });
  }
  if (!html.trim()) return '';

  let output = html.replace(/<!--[\s\S]*?-->/g, '');
  output = output.replace(/<\s*(script|iframe|object|embed|form|input|textarea|button|select|option|link|meta|base|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  output = output.replace(/<\s*(script|iframe|object|embed|form|input|textarea|button|select|option|link|meta|base|svg|math)[^>]*\/\s*>/gi, '');
  output = output.replace(/<\s*(script|iframe|object|embed|form|input|textarea|button|select|option|link|meta|base|svg|math)[^>]*>/gi, '');

  output = output.replace(TAG_RE, (full, rawTag, rawAttrs) => {
    const closing = full.startsWith('</');
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing) return `</${tag}>`;
    const safeAttrs = sanitizeAttrs(tag, rawAttrs || '');
    if (tag === 'img') return `<${tag}${safeAttrs}>`;
    return `<${tag}${safeAttrs}>`;
  });

  output = output.replace(/\s(on\w+|formaction|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return output.trim();
}

module.exports = { sanitizeArticleHtml, isSafeUrl, ALLOWED_TAGS };
