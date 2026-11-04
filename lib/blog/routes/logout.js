const {
  sendJson,
  sameOrigin,
  requireJsonContentType,
  sessionIdFromRequest,
  clearSessionCookie,
  handleBlogError
} = require('../_lib/http');
const { authConfigured, requireAdmin, destroySession } = require('../_lib/auth');

module.exports = async function blogLogout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }
  if (!sameOrigin(req)) {
    return sendJson(res, 403, { error: 'Request could not be verified.' });
  }
  if (!requireJsonContentType(req)) {
    return sendJson(res, 415, { error: 'Unsupported request format.' });
  }

  try {
    await requireAdmin(req, { csrf: true });
    const sessionId = sessionIdFromRequest(req);
    await destroySession(sessionId);
    clearSessionCookie(res, req);
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
