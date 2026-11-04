const { createHash, randomUUID, timingSafeEqual } = require('node:crypto');
const { KEY_PREFIX } = require('./constants');
const { redisCommand, isConfigured } = require('./redis');
const { BlogError, CODES } = require('./errors');
const { clientIp, sessionIdFromRequest } = require('./http');

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 5;
const CSRF_HEADER = 'x-pd-blog-csrf';

function sessionKey(sessionId) {
  return `${KEY_PREFIX}session:${sessionId}`;
}

function loginRateKey(req) {
  const secret = process.env.BLOG_SESSION_SECRET || 'missing';
  const ip = clientIp(req);
  const hash = createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
  return `${KEY_PREFIX}login:rate:${hash}`;
}

function authConfigured() {
  const password = process.env.BLOG_ADMIN_PASSWORD;
  const secret = process.env.BLOG_SESSION_SECRET;
  return (
    isConfigured() &&
    typeof password === 'string' &&
    password.length >= 12 &&
    typeof secret === 'string' &&
    secret.length >= 32
  );
}

function assertAuthConfigured() {
  if (!authConfigured()) {
    throw new BlogError(CODES.NOT_CONFIGURED, 'Blog admin authentication is not configured.');
  }
}

function verifyAdminPassword(provided) {
  const expected = process.env.BLOG_ADMIN_PASSWORD;
  if (typeof expected !== 'string' || typeof provided !== 'string') return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}

async function checkLoginRateLimit(req, command = redisCommand) {
  const key = loginRateKey(req);
  const count = await command(['INCR', key]);
  if (count === 1) {
    await command(['EXPIRE', key, String(LOGIN_WINDOW_SECONDS)]);
  }
  if (Number(count) > MAX_LOGIN_ATTEMPTS) {
    throw new BlogError(CODES.RATE_LIMITED, 'Too many login attempts. Try again later.');
  }
  return Number(count);
}

async function clearLoginRateLimit(req, command = redisCommand) {
  await command(['DEL', loginRateKey(req)]);
}

async function createSession(command = redisCommand) {
  const id = randomUUID();
  const csrfToken = randomUUID();
  const now = Date.now();
  const session = {
    id,
    csrfToken,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString()
  };
  await command(['SET', sessionKey(id), JSON.stringify(session), 'EX', String(SESSION_TTL_SECONDS)]);
  return session;
}

async function getSession(sessionId, command = redisCommand) {
  if (!sessionId) return null;
  const raw = await command(['GET', sessionKey(sessionId)]);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function destroySession(sessionId, command = redisCommand) {
  if (!sessionId) return;
  await command(['DEL', sessionKey(sessionId)]);
}

async function requireSession(sessionId, command = redisCommand) {
  assertAuthConfigured();
  const session = await getSession(sessionId, command);
  if (!session) {
    throw new BlogError(CODES.UNAUTHORIZED, 'Authentication required.');
  }
  const expiresAt = Date.parse(session.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await destroySession(sessionId, command);
    throw new BlogError(CODES.UNAUTHORIZED, 'Session expired.');
  }
  return session;
}

function csrfTokenFromRequest(req) {
  const header = req.headers[CSRF_HEADER] || req.headers[CSRF_HEADER.toLowerCase()];
  return typeof header === 'string' ? header.trim() : '';
}

function assertCsrf(req, session) {
  const token = csrfTokenFromRequest(req);
  if (!token || !session?.csrfToken) {
    throw new BlogError(CODES.CSRF_INVALID, 'CSRF token missing or invalid.');
  }
  const a = Buffer.from(token, 'utf8');
  const b = Buffer.from(session.csrfToken, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new BlogError(CODES.CSRF_INVALID, 'CSRF token missing or invalid.');
  }
}

async function requireAdmin(req, { csrf = false, command = redisCommand } = {}) {
  const session = await requireSession(sessionIdFromRequest(req), command);
  if (csrf) assertCsrf(req, session);
  return session;
}

module.exports = {
  SESSION_TTL_SECONDS,
  CSRF_HEADER,
  authConfigured,
  assertAuthConfigured,
  verifyAdminPassword,
  checkLoginRateLimit,
  clearLoginRateLimit,
  createSession,
  getSession,
  destroySession,
  requireSession,
  requireAdmin,
  assertCsrf,
  csrfTokenFromRequest,
  sessionKey
};
