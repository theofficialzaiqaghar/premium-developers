const { sendJson, handleBlogError } = require('./_lib/http');
const { authConfigured, requireAdmin } = require('./_lib/auth');
const { ARTICLE_STATUSES } = require('./_lib/constants');
const keys = require('./_lib/keys');
const { redisCommand } = require('./_lib/redis');

module.exports = async function blogStats(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }
  try {
    await requireAdmin(req);
    const byStatus = {};
    for (const status of ARTICLE_STATUSES) {
      const count = await redisCommand(['ZCARD', keys.articlesByStatus(status)]);
      byStatus[status] = Number(count) || 0;
    }
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    return sendJson(res, 200, {
      ok: true,
      total,
      byStatus,
      published: byStatus.published || 0
    });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
