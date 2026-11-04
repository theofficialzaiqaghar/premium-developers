const blogLogin = require('./routes/login');
const blogLogout = require('./routes/logout');
const blogSession = require('./routes/session');
const blogArticles = require('./routes/articles');
const blogArticle = require('./routes/article');
const blogHistory = require('./routes/history');
const blogStats = require('./routes/stats');
const blogSlugCheck = require('./routes/slug-check');
const blogPreview = require('./routes/preview');
const blogBackup = require('./routes/backup');
const blogCategories = require('./routes/categories');
const blogTags = require('./routes/tags');
const blogPublicArticles = require('./routes/public/articles');
const blogPublicArticle = require('./routes/public/article');

const ROUTES = {
  login: blogLogin,
  logout: blogLogout,
  session: blogSession,
  articles: blogArticles,
  article: blogArticle,
  history: blogHistory,
  stats: blogStats,
  'slug-check': blogSlugCheck,
  preview: blogPreview,
  backup: blogBackup,
  categories: blogCategories,
  tags: blogTags,
  'public/articles': blogPublicArticles,
  'public/article': blogPublicArticle
};

function segmentsFromRequest(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const prefix = '/api/blog/';
  if (!url.pathname.startsWith(prefix)) {
    return '';
  }
  return url.pathname.slice(prefix.length).replace(/\/+$/, '');
}

async function routeBlogApi(req, res) {
  const segments = segmentsFromRequest(req);
  const handler = ROUTES[segments];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Not found.' }));
    return;
  }
  return handler(req, res);
}

module.exports = { routeBlogApi, ROUTES, segmentsFromRequest };
