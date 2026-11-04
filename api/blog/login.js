const {
  sendJson,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  setSessionCookie,
  handleBlogError
} = require('./_lib/http');
const {
  authConfigured,
  verifyAdminPassword,
  checkLoginRateLimit,
  clearLoginRateLimit,
  createSession,
  SESSION_TTL_SECONDS
} = require('./_lib/auth');

module.exports = async function blogLogin(req, res) {
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

  const body = readJsonBody(req);
  if (!body) return sendJson(res, 400, { error: 'Invalid JSON body.' });

  try {
    await checkLoginRateLimit(req);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!verifyAdminPassword(password)) {
      return sendJson(res, 401, { error: 'Invalid credentials.' });
    }
    await clearLoginRateLimit(req);
    const session = await createSession();
    setSessionCookie(res, req, session.id, SESSION_TTL_SECONDS);
    return sendJson(res, 200, { ok: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt });
  } catch (err) {
    return handleBlogError(res, err);
  }
};
