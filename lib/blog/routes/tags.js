const {
  sendJson,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  handleBlogError
} = require('../_lib/http');
const { authConfigured, requireAdmin } = require('../_lib/auth');
const taxonomy = require('../_lib/taxonomy');

module.exports = async function blogTags(req, res) {
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
      const tags = await taxonomy.listTags();
      return sendJson(res, 200, { ok: true, tags });
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
      const tag = await taxonomy.upsertTag(body);
      return sendJson(res, 200, { ok: true, tag });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
    if (!requireJsonContentType(req)) return sendJson(res, 415, { error: 'Unsupported request format.' });
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const slug = url.searchParams.get('slug') || '';
    try {
      await requireAdmin(req, { csrf: true });
      const result = await taxonomy.deleteTag(slug);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return sendJson(res, 405, { error: 'Method not allowed.' });
};
