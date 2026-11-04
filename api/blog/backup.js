const {
  sendJson,
  sameOrigin,
  readJsonBody,
  requireJsonContentType,
  handleBlogError
} = require('./_lib/http');
const { authConfigured, requireAdmin } = require('./_lib/auth');
const { exportBackup, importBackup } = require('./_lib/backup');

module.exports = async function blogBackup(req, res) {
  if (!authConfigured()) {
    return sendJson(res, 503, { error: 'Blog CMS is not configured.' });
  }

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
      const backup = await exportBackup();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="blog-backup-${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.end(JSON.stringify(backup));
      return;
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  if (req.method === 'POST') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
    if (!requireJsonContentType(req)) return sendJson(res, 415, { error: 'Unsupported request format.' });
    const body = readJsonBody(req);
    if (!body) return sendJson(res, 400, { error: 'Invalid JSON body.' });
    try {
      await requireAdmin(req, { csrf: true });
      const mode = body.onSlugConflict === 'skip' ? 'skip' : 'fail';
      const report = await importBackup(body, { onSlugConflict: mode });
      return sendJson(res, 200, { ok: true, ...report });
    } catch (err) {
      return handleBlogError(res, err);
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Method not allowed.' });
};
