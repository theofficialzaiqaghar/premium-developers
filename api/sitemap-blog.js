const store = require('./blog/_lib/store');
const { isConfigured } = require('./blog/_lib/redis');
const { SITE_ORIGIN, canonicalArticleUrl } = require('./blog/_lib/ssr');

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toLastmod(article) {
  const iso = article.updatedAt || article.publishedAt;
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

module.exports = async function sitemapBlog(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method not allowed');
    return;
  }

  if (!isConfigured()) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    return;
  }

  try {
    const { items } = await store.listPublishedArticles({ limit: 500, offset: 0 });
    const urls = items
      .filter((a) => a.status === 'published' && a.slug)
      .map((a) => {
        const loc = canonicalArticleUrl(a.slug);
        const lastmod = toLastmod(a);
        return `<url><loc>${xmlEscape(loc)}</loc>${
          lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ''
        }<changefreq>monthly</changefreq><priority>0.7</priority></url>`;
      })
      .join('');

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${xmlEscape(`${SITE_ORIGIN}/blog/`)}</loc><changefreq>weekly</changefreq><priority>0.75</priority></url>
  ${urls}
</urlset>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
  } catch (error) {
    console.error('Blog sitemap generation failed:', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
};
