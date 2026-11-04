const { sendJson, sessionIdFromRequest, handleBlogError } = require('./_lib/http');
const { authConfigured, getSession } = require('./_lib/auth');

module.exports = async function blogSession(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  try {
    const sessionId = sessionIdFromRequest(req);
    const session = await getSession(sessionId);
    if (!session) {
      return sendJson(res, 200, { ok: true, authenticated: false });
    }
    const expiresAt = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return sendJson(res, 200, { ok: true, authenticated: false });
    }
    return sendJson(res, 200, {
      ok: true,
      authenticated: true,
      expiresAt: session.expiresAt,
      csrfToken: session.csrfToken
    });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
