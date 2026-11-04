const { sendJson, handleBlogError } = require('./_lib/http');
const { authConfigured, requireAdmin } = require('./_lib/auth');
const store = require('./_lib/store');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function blogHistory(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const id = (url.searchParams.get('articleId') || url.searchParams.get('id') || '').trim();
  if (!UUID_RE.test(id)) {
    return sendJson(res, 400, { error: 'Valid articleId query parameter is required.' });
  }

  try {
    await requireAdmin(req);
    const article = await store.getArticleById(id);
    if (!article) return sendJson(res, 404, { error: 'Article not found.' });
    const revisions = await store.getArticleHistory(id);
    return sendJson(res, 200, { ok: true, articleId: id, revisions });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
