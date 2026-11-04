const { sendJson, handleBlogError } = require('./_lib/http');
const { authConfigured, requireAdmin } = require('./_lib/auth');
const store = require('./_lib/store');
const { validateSlug } = require('./_lib/validate');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function blogSlugCheck(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }
  try {
    await requireAdmin(req);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const slug = validateSlug(url.searchParams.get('slug') || '');
    const exclude = (url.searchParams.get('excludeId') || '').trim();
    const excludeArticleId = UUID_RE.test(exclude) ? exclude : undefined;
    const available = await store.slugAvailable(slug, { excludeArticleId });
    return sendJson(res, 200, { ok: true, slug, available });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
