const { sendJson, handleBlogError } = require('../../_lib/http');
const store = require('../../_lib/store');
const { isConfigured } = require('../../_lib/redis');
const { toPublicListItem } = require('../../_lib/public');

module.exports = async function blogPublicArticles(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!isConfigured()) {
    return sendJson(res, 503, { error: 'Blog is temporarily unavailable.' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const result = await store.listPublishedArticles({
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset')
    });
    const items = result.items.map(toPublicListItem).filter(Boolean);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return sendJson(res, 200, { ok: true, items, offset: result.offset, limit: result.limit });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
