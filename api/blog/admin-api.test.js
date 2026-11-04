const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { createMockRedis } = require('./_lib/test/mock-redis');
const blogPreview = require('./preview');
const blogStats = require('./stats');
const blogLogin = require('./login');
const blogArticles = require('./articles');
const store = require('./_lib/store');
const { CSRF_HEADER } = require('./_lib/auth');

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
      if (!body) {
        this.body = null;
        return;
      }
      try {
        this.body = JSON.parse(body);
      } catch {
        this.body = body;
      }
    }
  };
}

function cookieFrom(res) {
  const raw = res.headers['Set-Cookie'];
  const line = Array.isArray(raw) ? raw[0] : raw;
  return line ? line.split(';')[0] : '';
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
    throw new Error(`Unexpected fetch ${url}`);
  };
});

afterEach(() => {
  global.fetch = previousFetch;
  for (const key of ENV_KEYS) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

async function loginSession() {
  const res = mockResponse();
  await blogLogin(
    {
      method: 'POST',
      url: '/api/blog/login',
      headers: { host: 'www.example.com', origin: 'https://www.example.com', 'content-type': 'application/json' },
      body: { password: ADMIN_PASSWORD }
    },
    res
  );
  assert.equal(res.statusCode, 200);
  return { cookie: cookieFrom(res), csrf: res.body.csrfToken };
}

test('preview requires authentication', async () => {
  const res = mockResponse();
  await blogPreview(
    {
      method: 'GET',
      url: '/api/blog/preview?id=11111111-1111-4111-8111-111111111111',
      headers: { host: 'www.example.com' }
    },
    res
  );
  assert.equal(res.statusCode, 401);
  assert.match(res.headers['X-Robots-Tag'], /noindex/);
});

test('preview returns draft HTML for admin only', async () => {
  await store.createArticle(
    {
      id: '11111111-1111-4111-8111-111111111111',
      slug: 'draft-preview',
      title: 'Draft Preview',
      bodyHtml: '<p>Secret draft body</p>',
      status: 'draft'
    },
    mockCommand
  );
  const { cookie } = await loginSession();
  const res = mockResponse();
  await blogPreview(
    {
      method: 'GET',
      url: '/api/blog/preview?id=11111111-1111-4111-8111-111111111111',
      headers: { host: 'www.example.com', cookie }
    },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Secret draft body/);
  assert.match(res.body, /Admin preview only/);
  assert.match(res.headers['X-Robots-Tag'], /noindex/);
});

test('stats returns counts for authenticated admin', async () => {
  await store.createArticle(
    { slug: 'one', title: 'One', bodyHtml: '<p>a</p>', status: 'draft' },
    mockCommand
  );
  const { cookie } = await loginSession();
  const res = mockResponse();
  await blogStats(
    { method: 'GET', url: '/api/blog/stats', headers: { host: 'www.example.com', cookie } },
    res
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.byStatus.draft, 1);
});

test('create strips script tags from bodyHtml', async () => {
  const { cookie, csrf } = await loginSession();
  const res = mockResponse();
  res.end = function end(body) {
    this.bodyText = body;
    this.body = body ? JSON.parse(body) : null;
  };
  await blogArticles(
    {
      method: 'POST',
      url: '/api/blog/articles',
      headers: {
        host: 'www.example.com',
        origin: 'https://www.example.com',
        cookie,
        [CSRF_HEADER]: csrf,
        'content-type': 'application/json'
      },
      body: {
        slug: 'safe-html',
        title: 'Safe',
        bodyHtml: '<p>OK</p><script>alert(1)</script>'
      }
    },
    res
  );
  assert.equal(res.statusCode, 201);
  assert.match(res.body.article.bodyHtml, /OK/);
  assert.doesNotMatch(res.body.article.bodyHtml, /script/i);
});
