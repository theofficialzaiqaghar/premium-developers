const {
  sendJson,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  handleBlogError
} = require('./_lib/http');
const { authConfigured, requireAdmin } = require('./_lib/auth');
const store = require('./_lib/store');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function articleIdFromRequest(req) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  return (url.searchParams.get('id') || '').trim();
}

module.exports = async function blogArticle(req, res) {
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  const id = articleIdFromRequest(req);
  if (!UUID_RE.test(id)) {
    return sendJson(res, 400, { error: 'Valid article id query parameter is required.' });
  }

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
      const article = await store.getArticleById(id);
      if (!article) return sendJson(res, 404, { error: 'Article not found.' });
      return sendJson(res, 200, { ok: true, article });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  if (req.method === 'PATCH') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
    if (!requireJsonContentType(req)) return sendJson(res, 415, { error: 'Unsupported request format.' });
    const body = readJsonBody(req);
    if (!body) return sendJson(res, 400, { error: 'Invalid JSON body.' });
    try {
      await requireAdmin(req, { csrf: true });
      const article = await store.updateArticle(id, body);
      return sendJson(res, 200, { ok: true, article });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
    if (!requireJsonContentType(req)) return sendJson(res, 415, { error: 'Unsupported request format.' });
    try {
      await requireAdmin(req, { csrf: true });
      const result = await store.deleteArticle(id);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE');
  return sendJson(res, 405, { error: 'Method not allowed.' });
};
