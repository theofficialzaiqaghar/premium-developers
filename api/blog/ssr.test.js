const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const {
  renderArticlePage,
  renderNotFoundPage,
  renderArchivePage,
  canonicalArticleUrl,
  escapeHtml
} = require('../../lib/blog/_lib/ssr');
const blogSsrArticle = require('./ssr/article');
const blogSsrArchive = require('./ssr/archive');
const sitemapBlog = require('../sitemap-blog');
const { createMockRedis } = require('../../lib/blog/test/mock-redis');
const store = require('../../lib/blog/_lib/store');

const publishedArticle = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'wordpress-performance-tips',
  status: 'published',
  title: 'WordPress Performance Tips',
  seoTitle: 'WordPress Performance Tips for Faster Sites',
  metaDescription: 'Practical ways to speed up WordPress without breaking your stack.',
  excerpt: 'Practical ways to speed up WordPress.',
  bodyHtml: '<p>Full article body visible in HTML.</p><h2>Caching</h2><p>Use object cache.</p>',
  author: 'Premium Developers',
  publishedAt: '2025-06-01T10:00:00.000Z',
  updatedAt: '2025-06-02T10:00:00.000Z',
  categorySlugs: ['wordpress'],
  tagSlugs: [],
  featuredImage: {
    url: 'https://www.premiumdevelopers.co/assets/images/og/premium-developers-og.jpg',
    alt: 'WordPress performance illustration',
    filename: ''
  },
  schemaVersion: 1,
  revision: 1,
  createdAt: '2025-06-01T09:00:00.000Z'
};

test('escapeHtml encodes unsafe characters', () => {
  assert.equal(escapeHtml('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});

test('renderArticlePage includes crawlable content and SEO tags', () => {
  const html = renderArticlePage(publishedArticle, []);
  assert.match(html, /<h1[^>]*>WordPress Performance Tips<\/h1>/);
  assert.match(html, /Full article body visible in HTML/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.premiumdevelopers\.co\/blog\/wordpress-performance-tips\/"/);
  assert.match(html, /<meta name="description" content="Practical ways to speed up WordPress without breaking your stack\."/);
  assert.match(html, /property="og:type" content="article"/);
  assert.match(html, /"@type": "Article"/);
  assert.match(html, /WordPress performance illustration/);
  assert.doesNotMatch(html, /meta name="keywords"/i);
});

test('renderNotFoundPage uses noindex', () => {
  const html = renderNotFoundPage();
  assert.match(html, /noindex, follow/);
  assert.match(html, /Article not found/);
});

test('renderArchivePage includes crawlable article links', () => {
  const html = renderArchivePage([publishedArticle]);
  assert.match(html, /href="https:\/\/www\.premiumdevelopers\.co\/blog\/wordpress-performance-tips\/"/);
  assert.match(html, /Featured article/);
});

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

let mockCommand;
let previousFetch;
let previousEnv;

beforeEach(() => {
  previousEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
  };
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
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
  process.env.UPSTASH_REDIS_REST_URL = previousEnv.UPSTASH_REDIS_REST_URL;
  process.env.UPSTASH_REDIS_REST_TOKEN = previousEnv.UPSTASH_REDIS_REST_TOKEN;
});

test('SSR article handler returns 404 for draft slug', async () => {
  await store.createArticle(
    { ...publishedArticle, status: 'draft', slug: 'draft-only-post' },
    mockCommand
  );
  const req = {
    method: 'GET',
    url: '/api/blog/ssr/article?slug=draft-only-post',
    headers: { host: 'www.example.com' }
  };
  const res = mockResponse();
  await blogSsrArticle(req, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /Article not found/);
});

test('SSR article handler returns 200 HTML for published slug', async () => {
  await store.createArticle(publishedArticle, mockCommand);
  const req = {
    method: 'GET',
    url: '/api/blog/ssr/article?slug=wordpress-performance-tips',
    headers: { host: 'www.example.com', 'user-agent': 'Googlebot' }
  };
  const res = mockResponse();
  await blogSsrArticle(req, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Full article body visible in HTML/);
  assert.match(res.headers['Content-Type'], /text\/html/);
});

test('SSR archive handler returns published cards only', async () => {
  await store.createArticle(publishedArticle, mockCommand);
  await store.createArticle(
    { ...publishedArticle, id: '22222222-2222-4222-8222-222222222222', slug: 'draft-two', status: 'draft' },
    mockCommand
  );
  const res = mockResponse();
  await blogSsrArchive({ method: 'GET', url: '/api/blog/ssr/archive', headers: { host: 'www.example.com' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /wordpress-performance-tips/);
  assert.doesNotMatch(res.body, /draft-two/);
});

test('sitemap includes only published URLs with lastmod', async () => {
  await store.createArticle(publishedArticle, mockCommand);
  await store.createArticle(
    { ...publishedArticle, id: '22222222-2222-4222-8222-222222222222', slug: 'draft-two', status: 'draft' },
    mockCommand
  );
  const res = mockResponse();
  await sitemapBlog({ method: 'GET', url: '/api/sitemap-blog', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<loc>https:\/\/www\.premiumdevelopers\.co\/blog\/wordpress-performance-tips\/<\/loc>/);
  assert.match(res.body, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  assert.doesNotMatch(res.body, /draft-two/);
});

test('canonicalArticleUrl uses trailing slash', () => {
  assert.equal(
    canonicalArticleUrl('my-post'),
    'https://www.premiumdevelopers.co/blog/my-post/'
  );
});
