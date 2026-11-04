const { handleBlogError } = require('../_lib/http');
const { BlogError } = require('../_lib/errors');
const { authConfigured, requireAdmin } = require('../_lib/auth');
const store = require('../_lib/store');
const { renderArticlePage } = require('../_lib/ssr');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function previewBanner(status) {
  return `<div class="blog-preview-banner" style="background:#0B2640;color:#fff;padding:12px 16px;text-align:center;font-family:system-ui,sans-serif;font-size:14px;">
  Admin preview only — status: <strong>${status}</strong>. Not indexed. Not publicly accessible.
</div>`;
}

module.exports = async function blogPreview(req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
    return;
  }
  if (!authConfigured()) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html><body><p>Blog CMS is not configured.</p></body></html>');
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const id = (url.searchParams.get('id') || '').trim();
  if (!UUID_RE.test(id)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!DOCTYPE html><html><body><p>Valid article id is required.</p></body></html>');
    return;
  }

  try {
    await requireAdmin(req);
    const article = await store.getArticleById(id);
    if (!article) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.end('<!DOCTYPE html><html><body><p>Article not found.</p></body></html>');
      return;
    }

    let html = renderArticlePage(article, []);
    html = html.replace('<body class="service-page blog-page">', `<body class="service-page blog-page">${previewBanner(article.status)}`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.end(html);
  } catch (err) {
    if (
      err instanceof BlogError &&
      (err.code === 'UNAUTHORIZED' || err.code === 'CSRF_INVALID' || err.code === 'FORBIDDEN')
    ) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.end('<!DOCTYPE html><html><body><p>Authentication required for preview.</p></body></html>');
      return;
    }
    return handleBlogError(res, err);
  }
};
