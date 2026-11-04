const store = require('../_lib/store');
const { isConfigured } = require('../_lib/redis');
const { renderArchivePage } = require('../_lib/ssr');
module.exports = async function blogSsrArchive(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Method not allowed');
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
    const { items } = await store.listPublishedArticles({ limit: 100, offset: 0 });
    const articles = items.filter((a) => a.status === 'published' && a.slug);
    const html = renderArchivePage(articles);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(html);
  } catch (error) {
    console.error('Blog archive SSR failed:', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('<!DOCTYPE html><html><body><h1>Blog temporarily unavailable</h1></body></html>');
  }
};
