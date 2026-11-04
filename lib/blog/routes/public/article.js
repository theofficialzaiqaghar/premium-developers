const { sendJson, handleBlogError } = require('../../_lib/http');
const store = require('../../_lib/store');
const { isConfigured } = require('../../_lib/redis');
const { toPublicArticle } = require('../../_lib/public');
const { normalizeSlug } = require('../../_lib/validate');

module.exports = async function blogPublicArticle(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!isConfigured()) {
    return sendJson(res, 503, { error: 'Blog is temporarily unavailable.' });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  if (!slug) {
    return sendJson(res, 400, { error: 'slug query parameter is required.' });
  }

  try {
    const article = await store.getArticleBySlug(slug);
    const publicArticle = toPublicArticle(article);
    if (!publicArticle) {
      return sendJson(res, 404, { error: 'Article not found.' });
    }
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return sendJson(res, 200, { ok: true, article: publicArticle });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
