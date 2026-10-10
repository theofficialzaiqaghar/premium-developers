const { createHash } = require('node:crypto');

const redisReserveScript = [
  "local existing = redis.call('GET', KEYS[1])",
  "if existing == 'done' then return 2 end",
  'if existing then return 3 end',
  "local count = redis.call('INCR', KEYS[2])",
  "if count == 1 then redis.call('EXPIRE', KEYS[2], 3600) end",
  'if count > tonumber(ARGV[1]) then return -1 end',
  "redis.call('SET', KEYS[1], 'processing', 'EX', 900)",
  'return 1'
].join('\n');

const redisCompleteScript = [
  "redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1])",
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])",
  "redis.call('EXPIRE', KEYS[1], ARGV[4])",
  "redis.call('SET', KEYS[2], 'done', 'EX', 31536000)",
  'return 1'
].join('\n');

const reasons = new Set([
  'Just browsing',
  'Services are too expensive',
  "Couldn't find what I needed",
  'Not ready to purchase',
  'Looking for other options',
  'Other'
]);

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function discountConfig(now = Date.now()) {
  const code = clean(process.env.EXIT_DISCOUNT_CODE, 40);
  const percent = Number(process.env.EXIT_DISCOUNT_PERCENT || 35);
  const expiresAt = clean(process.env.EXIT_DISCOUNT_EXPIRES_AT, 40);
  const expiry = expiresAt ? Date.parse(expiresAt) : null;
  const validCode = /^[A-Za-z0-9_-]{2,40}$/.test(code);
  const validPercent = Number.isInteger(percent) && percent > 0 && percent <= 100;
  const validExpiry = !expiresAt || (Number.isFinite(expiry) && expiry > now);
  return {
    code,
    percent,
    expiresAt,
    configured: validCode && validPercent && validExpiry
  };
}

function integrationsConfigured(config) {
  const retention = process.env.EXIT_FEEDBACK_RETENTION_DAYS;
  const retentionDays = retention === undefined || retention === ''
    ? 365
    : Number(retention);
  return Boolean(
    config.configured &&
    process.env.EXIT_DISCOUNT_CONFIRMED === 'true' &&
    process.env.RESEND_API_KEY &&
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    Number.isInteger(retentionDays) &&
    retentionDays >= 1 &&
    retentionDays <= 3650
  );
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

function normalizePageUrl(value, req) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const page = new URL(value);
    if (page.host !== req.headers.host || !['http:', 'https:'].includes(page.protocol)) return '';
    return `${page.origin}${page.pathname}`.slice(0, 1000);
  } catch {
    return '';
  }
}

function validate(payload, req) {
  const fieldErrors = {};
  const email = clean(payload.email, 254);
  const reason = clean(payload.reason, 60);
  const comments = clean(payload.comments, 500);
  const submissionId = clean(payload.submissionId, 64);
  const pageUrl = normalizePageUrl(payload.pageUrl, req);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Enter a valid email address.';
  }
  if (!reasons.has(reason)) fieldErrors.reason = 'Choose a reason for your feedback.';
  if (typeof payload.consent !== 'boolean') fieldErrors.consent = 'Check your email preferences and try again.';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    fieldErrors.submissionId = 'Refresh the page and try again.';
  }
  if (!pageUrl) fieldErrors.pageUrl = 'Refresh the page and try again.';

  return { fieldErrors, email, reason, comments, submissionId, pageUrl };
}

function redisUrl() {
  const value = process.env.UPSTASH_REDIS_REST_URL;
  if (!value) throw new Error('Upstash Redis is not configured.');
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Upstash Redis REST URL must use HTTPS.');
  return url.toString().replace(/\/+$/, '');
}

async function redisCommand(command) {
  const response = await fetch(redisUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000)
  });
  const result = await response.json();
  if (!response.ok || result.error) {
    throw new Error('Upstash Redis request failed.');
  }
  return result.result;
}

async function sendEmail({ to, subject, text, replyTo, html }) {
  const from = process.env.MAIL_FROM || 'Premium Developers <hello@premiumdevelopers.co>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      ...(replyTo ? { reply_to: replyTo } : {}),
      subject,
      text,
      ...(html ? { html } : {})
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    console.error('Exit feedback email delivery failed with status:', response.status);
    throw new Error('Email delivery failed.');
  }
}

function clientIp(req) {
  const realIp = req.headers['x-real-ip'];
  return typeof realIp === 'string' && realIp.trim() ? realIp.trim() : 'unknown';
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

async function deliverDiscountEmail(email, config) {
  const subject = clean(process.env.EXIT_DISCOUNT_EMAIL_SUBJECT, 120) ||
    `Your ${config.percent}% off code from Premium Developers`;
  const intro = clean(process.env.EXIT_DISCOUNT_EMAIL_INTRO, 300) ||
    'Thanks for sharing your feedback. Here is the discount code you requested:';
  const expiryText = config.expiresAt
    ? `Valid until ${new Date(config.expiresAt).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })} (UTC).`
    : 'Use the code while it remains active.';
  const safeIntro = escapeHtml(intro);
  const safeCode = escapeHtml(config.code);
  const safeExpiry = escapeHtml(expiryText);
  await sendEmail({
    to: email,
    subject,
    text: `${intro}\n\n${config.percent}% off code: ${config.code}\n${expiryText}\n\nUse this code at checkout. It is subject to the offer terms.`,
    html: `<p>${safeIntro}</p><p style="font-size:28px;font-weight:800;letter-spacing:2px">${config.percent}% OFF: ${safeCode}</p><p>${safeExpiry}</p><p>Use this code at checkout. It is subject to the offer terms.</p>`
  });
}

async function deliverFeedbackEmail(record) {
  const lines = [
    'New exit-intent feedback',
    '',
    `Email: ${record.email}`,
    `Reason: ${record.reason}`,
    `Additional comments: ${record.comments || 'Not provided'}`,
    `Promotional email consent: ${record.consent ? 'Yes' : 'No'}`,
    `Page: ${record.pageUrl}`,
    `Submitted at: ${record.submittedAt}`
  ];
  await sendEmail({
    to: process.env.CONTACT_TO || 'hello@premiumdevelopers.co',
    replyTo: record.email,
    subject: `Website exit feedback: ${record.reason}`,
    text: lines.join('\n')
  });
}

module.exports = async function exitFeedback(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });

  const config = discountConfig();
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      enabled: integrationsConfigured(config),
      discountPercent: config.percent
    });
  }

  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    return sendJson(res, 415, { error: 'Unsupported request format.' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return sendJson(res, 400, { error: 'Please check your feedback and try again.' });
  }
  if (clean(payload.website, 200)) {
    return sendJson(res, 400, { error: 'Please check your feedback and try again.' });
  }
  const elapsedMs = Number(payload.elapsedMs);
  if (!Number.isFinite(elapsedMs) || elapsedMs < 2500) {
    return sendJson(res, 400, { error: 'Please take a moment to review your feedback before sending.' });
  }

  const { fieldErrors, email, reason, comments, submissionId, pageUrl } = validate(payload, req);
  if (Object.keys(fieldErrors).length) {
    return sendJson(res, 400, { error: 'Please review the highlighted fields.', fieldErrors });
  }
  if (!integrationsConfigured(config)) {
    console.error('Exit feedback is unavailable: configure a valid discount, Resend, and Upstash Redis.');
    return sendJson(res, 503, { error: 'The discount offer is temporarily unavailable. Please contact us for help.' });
  }

  const ipHash = createHash('sha256').update(clientIp(req)).digest('hex');
  const submissionKey = `exit-feedback:submission:${submissionId}`;
  try {
    const reservation = Number(await redisCommand([
      'EVAL',
      redisReserveScript,
      '2',
      submissionKey,
      `exit-feedback:rate:${ipHash}`,
      '5'
    ]));
    if (reservation === 2) return sendJson(res, 200, { ok: true, duplicate: true });
    if (reservation === 3) {
      return sendJson(res, 409, { error: 'Your feedback is still being processed. Wait a moment before retrying.' });
    }
    if (reservation < 0) {
      return sendJson(res, 429, { error: 'Too many discount requests from this connection. Please try again later.' });
    }

    const record = {
      email,
      reason,
      comments,
      consent: payload.consent,
      pageUrl,
      submittedAt: new Date().toISOString()
    };

    try {
      await deliverDiscountEmail(email, config);
      await deliverFeedbackEmail(record);
      const retentionDays = process.env.EXIT_FEEDBACK_RETENTION_DAYS === undefined ||
        process.env.EXIT_FEEDBACK_RETENTION_DAYS === ''
        ? 365
        : Number(process.env.EXIT_FEEDBACK_RETENTION_DAYS);
      const retentionSeconds = retentionDays * 86400;
      const now = Date.now();
      await redisCommand([
        'EVAL',
        redisCompleteScript,
        '2',
        'exit-feedback:submissions',
        submissionKey,
        JSON.stringify(record),
        String(now),
        String(now - retentionSeconds * 1000),
        String(retentionSeconds)
      ]);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      try {
        await redisCommand(['DEL', submissionKey]);
      } catch (releaseError) {
        console.error('Could not release an exit feedback retry reservation:', releaseError);
      }
      throw error;
    }
  } catch (error) {
    console.error('Exit feedback processing failed:', error);
    return sendJson(res, 503, { error: 'We couldn’t process your request just now. Please try again shortly.' });
  }
};
