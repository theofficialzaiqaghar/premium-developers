const store = require('../../../lib/blog/_lib/store');
const { isConfigured } = require('../../../lib/blog/_lib/redis');
const { renderArticlePage, renderNotFoundPage, pickRelated } = require('../../../lib/blog/_lib/ssr');
const { toPublicArticle } = require('../../../lib/blog/_lib/public');
const { normalizeSlug } = require('../../../lib/blog/_lib/validate');

function slugFromRequest(req) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const fromQuery = normalizeSlug(url.searchParams.get('slug') || '');
  if (fromQuery) return fromQuery;
  return '';
}

module.exports = async function blogSsrArticle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }

  const slug = slugFromRequest(req);
  if (!slug) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(renderNotFoundPage('article'));
    return;
  }

  if (!isConfigured()) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('<!DOCTYPE html><html><body><h1>Blog temporarily unavailable</h1></body></html>');
    return;
  }

  try {
    const record = await store.getArticleBySlug(slug);
    const article = toPublicArticle(record);
    if (!article) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(renderNotFoundPage('article'));
      return;
    }

    const { items } = await store.listPublishedArticles({ limit: 50, offset: 0 });
    const published = items.filter((a) => a.status === 'published');
    const related = pickRelated(article, published, 3);
    const html = renderArticlePage(article, related);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(html);
  } catch (error) {
    console.error('Blog article SSR failed:', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('<!DOCTYPE html><html><body><h1>Blog temporarily unavailable</h1></body></html>');
  }
};
