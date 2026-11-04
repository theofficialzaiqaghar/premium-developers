const { BlogError, CODES } = require('./errors');

const SESSION_COOKIE = 'pd_blog_session';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function parseCookies(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function cookieSecure(req) {
  if (process.env.BLOG_COOKIE_SECURE === 'true') return true;
  if (process.env.BLOG_COOKIE_SECURE === 'false') return false;
  const host = req.headers.host || '';
  return !/localhost|127\.0\.0\.1/i.test(host);
}

function appendSetCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
}

function setSessionCookie(res, req, sessionId, maxAgeSeconds) {
  const secure = cookieSecure(req);
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (secure) parts.push('Secure');
  appendSetCookie(res, parts.join('; '));
}

function clearSessionCookie(res, req) {
  const secure = cookieSecure(req);
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) parts.push('Secure');
  appendSetCookie(res, parts.join('; '));
}

function sessionIdFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const value = cookies[SESSION_COOKIE];
  if (!value || typeof value !== 'string') return '';
  if (!/^[0-9a-f-]{36}$/i.test(value)) return '';
  return value;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function readJsonBody(req) {
  const payload = req.body;
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'object' && !Array.isArray(payload)) return payload;
  return null;
}

function requireJsonContentType(req) {
  const type = req.headers['content-type'];
  return typeof type === 'string' && type.toLowerCase().startsWith('application/json');
}

function clientIp(req) {
  const forwarded = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (typeof req.headers['x-real-ip'] === 'string') return req.headers['x-real-ip'].trim();
  return '0.0.0.0';
}

function mapErrorToResponse(err) {
  if (!(err instanceof BlogError)) {
    return { status: 500, body: { error: 'An unexpected error occurred.' } };
  }
  switch (err.code) {
    case CODES.VALIDATION:
      return { status: 400, body: { error: err.message, fieldErrors: err.details?.fieldErrors, code: err.code } };
    case CODES.NOT_FOUND:
      return { status: 404, body: { error: err.message, code: err.code } };
    case CODES.SLUG_EXISTS:
    case CODES.IMPORT_CONFLICT:
      return { status: 409, body: { error: err.message, code: err.code, details: err.details } };
    case CODES.UNAUTHORIZED:
      return { status: 401, body: { error: err.message, code: err.code } };
    case CODES.FORBIDDEN:
      return { status: 403, body: { error: err.message, code: err.code } };
    case CODES.CSRF_INVALID:
      return { status: 403, body: { error: err.message, code: err.code } };
    case CODES.RATE_LIMITED:
      return { status: 429, body: { error: err.message, code: err.code } };
    case CODES.NOT_CONFIGURED:
      return { status: 503, body: { error: 'Blog CMS is not configured.', code: err.code } };
    case CODES.PAYLOAD_TOO_LARGE:
      return { status: 413, body: { error: err.message, code: err.code } };
    case CODES.BACKUP_INVALID:
      return { status: 400, body: { error: err.message, code: err.code } };
    case CODES.REDIS:
      return { status: 503, body: { error: 'Blog storage is temporarily unavailable.', code: err.code } };
    default:
      return { status: 500, body: { error: err.message, code: err.code } };
  }
}

function handleBlogError(res, err) {
  const mapped = mapErrorToResponse(err);
  return sendJson(res, mapped.status, mapped.body);
}

module.exports = {
  SESSION_COOKIE,
  sendJson,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  sessionIdFromRequest,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  clientIp,
  handleBlogError
};
