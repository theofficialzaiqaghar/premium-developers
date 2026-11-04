const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { createMockRedis } = require('../../lib/blog/test/mock-redis');

const blogLogin = require('../../lib/blog/routes/login');
const blogLogout = require('../../lib/blog/routes/logout');
const blogSession = require('../../lib/blog/routes/session');
const blogArticles = require('../../lib/blog/routes/articles');
const blogArticle = require('../../lib/blog/routes/article');
const blogPublicArticles = require('../../lib/blog/routes/public/articles');
const blogPublicArticle = require('../../lib/blog/routes/public/article');
const { CSRF_HEADER } = require('../../lib/blog/_lib/auth');

const ENV_KEYS = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'BLOG_ADMIN_PASSWORD',
  'BLOG_SESSION_SECRET'
];

const ADMIN_PASSWORD = 'correct-horse-battery-staple';
const SESSION_SECRET = '0123456789abcdef0123456789abcdef0123456789ab';

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    getHeader(name) {
      return this.headers[name];
    },
    end(body) {
      this.bodyText = body;
      try {
        this.body = body ? JSON.parse(body) : null;
      } catch {
        this.body = body;
      }
    }
  };
}

function requestHandler(handler, { method = 'GET', url = '/', headers = {}, body = undefined } = {}) {
  const req = {
    method,
    url,
    headers: {
      host: 'www.example.com',
      origin: 'https://www.example.com',
      'content-type': 'application/json',
      ...headers
    },
    body
  };
  const res = mockResponse();
  return handler(req, res).then(() => res);
}

function cookieFromSetHeader(res) {
  const raw = res.headers['Set-Cookie'];
  const line = Array.isArray(raw) ? raw[0] : raw;
  if (!line) return '';
  return line.split(';')[0];
}

let mockCommand;
let previousFetch;
let previousEnv;

beforeEach(() => {
  previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  process.env.BLOG_ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.BLOG_SESSION_SECRET = SESSION_SECRET;
  mockCommand = createMockRedis();
  previousFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://redis.example.com')) {
      const command = JSON.parse(options.body);
      const result = await mockCommand(command);
      return { ok: true, json: async () => ({ result }) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
});

afterEach(() => {
  global.fetch = previousFetch;
  for (const key of ENV_KEYS) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

test('login rejects invalid credentials', async () => {
  const res = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: 'wrong-password-here' }
  });
  assert.equal(res.statusCode, 401);
});

test('login sets session cookie and returns csrf token', async () => {
  const res = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: ADMIN_PASSWORD }
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.match(res.body.csrfToken, /^[0-9a-f-]{36}$/i);
  assert.match(String(res.headers['Set-Cookie']), /pd_blog_session=/);
});

test('admin article routes require authentication', async () => {
  const res = await requestHandler(blogArticles, { method: 'GET', url: '/api/blog/articles' });
  assert.equal(res.statusCode, 401);
});

test('mutating routes require CSRF token', async () => {
  const login = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: ADMIN_PASSWORD }
  });
  const cookie = cookieFromSetHeader(login);
  const res = await requestHandler(blogArticles, {
    method: 'POST',
    url: '/api/blog/articles',
    headers: { cookie },
    body: { slug: 'csrf-test', title: 'T', bodyHtml: '<p>x</p>' }
  });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'CSRF_INVALID');
});

test('CRUD flow with auth and CSRF', async () => {
  const login = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: ADMIN_PASSWORD }
  });
  const cookie = cookieFromSetHeader(login);
  const csrf = login.body.csrfToken;

  const created = await requestHandler(blogArticles, {
    method: 'POST',
    url: '/api/blog/articles',
    headers: { cookie, [CSRF_HEADER]: csrf },
    body: { slug: 'admin-crud', title: 'CRUD', bodyHtml: '<p>hello</p>', status: 'draft' }
  });
  assert.equal(created.statusCode, 201);
  const id = created.body.article.id;

  const listed = await requestHandler(blogArticles, {
    method: 'GET',
    url: '/api/blog/articles?search=crud',
    headers: { cookie }
  });
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.body.items.length, 1);

  const patched = await requestHandler(blogArticle, {
    method: 'PATCH',
    url: `/api/blog/article?id=${id}`,
    headers: { cookie, [CSRF_HEADER]: csrf },
    body: { title: 'Updated CRUD' }
  });
  assert.equal(patched.statusCode, 200);
  assert.equal(patched.body.article.title, 'Updated CRUD');

  const pubRes = await requestHandler(blogPublicArticle, {
    method: 'GET',
    url: '/api/blog/public/article?slug=admin-crud'
  });
  assert.equal(pubRes.statusCode, 404);

  const publishFail = await requestHandler(blogArticle, {
    method: 'PATCH',
    url: `/api/blog/article?id=${id}`,
    headers: { cookie, [CSRF_HEADER]: csrf },
    body: { status: 'published' }
  });
  assert.equal(publishFail.statusCode, 400);

  const published = await requestHandler(blogArticle, {
    method: 'PATCH',
    url: `/api/blog/article?id=${id}`,
    headers: { cookie, [CSRF_HEADER]: csrf },
    body: {
      status: 'published',
      publishedAt: '2025-06-01T12:00:00.000Z'
    }
  });
  assert.equal(published.statusCode, 200);

  const publicOne = await requestHandler(blogPublicArticle, {
    method: 'GET',
    url: '/api/blog/public/article?slug=admin-crud'
  });
  assert.equal(publicOne.statusCode, 200);
  assert.equal(publicOne.body.article.status, undefined);

  const publicList = await requestHandler(blogPublicArticles, {
    method: 'GET',
    url: '/api/blog/public/articles'
  });
  assert.equal(publicList.statusCode, 200);
  assert.equal(publicList.body.items.length, 1);

  const deleted = await requestHandler(blogArticle, {
    method: 'DELETE',
    url: `/api/blog/article?id=${id}`,
    headers: { cookie, [CSRF_HEADER]: csrf },
    body: {}
  });
  assert.equal(deleted.statusCode, 200);
});

test('duplicate slug returns 409', async () => {
  const login = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: ADMIN_PASSWORD }
  });
  const cookie = cookieFromSetHeader(login);
  const csrf = login.body.csrfToken;
  const headers = { cookie, [CSRF_HEADER]: csrf };

  await requestHandler(blogArticles, {
    method: 'POST',
    url: '/api/blog/articles',
    headers,
    body: { slug: 'dupe-slug', title: 'A', bodyHtml: '<p>a</p>' }
  });
  const dupe = await requestHandler(blogArticles, {
    method: 'POST',
    url: '/api/blog/articles',
    headers,
    body: { slug: 'dupe-slug', title: 'B', bodyHtml: '<p>b</p>' }
  });
  assert.equal(dupe.statusCode, 409);
});

test('redis failure returns 503 without leaking internals', async () => {
  global.fetch = async () => ({ ok: false, json: async () => ({ error: 'boom' }) });
  const res = await requestHandler(blogPublicArticles, {
    method: 'GET',
    url: '/api/blog/public/articles'
  });
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'Blog storage is temporarily unavailable.');
});

test('login rate limits repeated failures', async () => {
  for (let i = 0; i < 5; i += 1) {
    await requestHandler(blogLogin, {
      method: 'POST',
      url: '/api/blog/login',
      body: { password: 'wrong-password-here' }
    });
  }
  const blocked = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: 'wrong-password-here' }
  });
  assert.equal(blocked.statusCode, 429);
});

test('session endpoint reports authenticated state', async () => {
  const anon = await requestHandler(blogSession, { method: 'GET', url: '/api/blog/session' });
  assert.equal(anon.body.authenticated, false);

  const login = await requestHandler(blogLogin, {
    method: 'POST',
    url: '/api/blog/login',
    body: { password: ADMIN_PASSWORD }
  });
  const cookie = cookieFromSetHeader(login);
  const authed = await requestHandler(blogSession, {
    method: 'GET',
    url: '/api/blog/session',
    headers: { cookie }
  });
  assert.equal(authed.body.authenticated, true);
  assert.equal(authed.body.csrfToken, login.body.csrfToken);
});
