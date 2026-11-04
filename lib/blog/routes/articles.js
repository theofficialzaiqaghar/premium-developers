const {
  sendJson,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  handleBlogError
} = require('../_lib/http');
const { authConfigured, requireAdmin } = require('../_lib/auth');
const store = require('../_lib/store');

module.exports = async function blogArticles(req, res) {
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
      const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
      const result = await store.searchArticles({
        status: url.searchParams.get('status') || '',
        search: url.searchParams.get('search') || url.searchParams.get('q') || '',
        limit: url.searchParams.get('limit'),
        offset: url.searchParams.get('offset')
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  if (req.method === 'POST') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
    if (!requireJsonContentType(req)) return sendJson(res, 415, { error: 'Unsupported request format.' });
    const body = readJsonBody(req);
    if (!body) return sendJson(res, 400, { error: 'Invalid JSON body.' });
    try {
      await requireAdmin(req, { csrf: true });
      if (body.status === 'published') {
        return sendJson(res, 400, {
          error: 'Publishing requires a separate confirmed publish action with publishedAt.',
          code: 'VALIDATION'
        });
      }
      const article = await store.createArticle(body);
      return sendJson(res, 201, { ok: true, article });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Method not allowed.' });
};
