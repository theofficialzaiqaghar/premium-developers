const { createHash } = require('node:crypto');

const recipients = [
  'hello@premiumdevelopers.co',
  'muhammadsaadullah093@gmail.com'
];
const availableServices = new Set([
  'Website Speed & Performance Optimization',
  'SEO Optimization',
  'Content Writing',
  'Multiple Services'
]);
const reservationScript = [
  "local status = redis.call('GET', KEYS[1])",
  "if status == 'sent' then return 2 end",
  "if status == 'processing' then return 3 end",
  'if not status then',
  "  local count = redis.call('INCR', KEYS[2])",
  "  if count == 1 then redis.call('EXPIRE', KEYS[2], 3600) end",
  '  if count > tonumber(ARGV[1]) then return -1 end',
  'end',
  "redis.call('SET', KEYS[1], 'processing', 'EX', 900)",
  "if status == 'stored' then return 4 end",
  'return 1'
].join('\n');
const storeLeadScript = [
  "redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])",
  "redis.call('ZADD', KEYS[1], ARGV[4], ARGV[5])",
  "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[2])",
  "redis.call('EXPIRE', KEYS[1], ARGV[3])",
  'return 1'
].join('\n');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clean(value, maxLength) {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, maxLength)
    : '';
}

function validate(payload) {
  const fieldErrors = {};
  const fullName = clean(payload.fullName, 100);
  const email = clean(payload.email, 254);
  const websiteUrl = clean(payload.websiteUrl, 2048);
  const businessName = clean(payload.businessName, 120);
  const phone = clean(payload.phone, 40);
  const budget = clean(payload.budget, 120);
  const projectDetails = clean(payload.projectDetails, 5000);
  const services = Array.isArray(payload.services)
    ? [...new Set(payload.services.map(service => clean(service, 80)).filter(Boolean))]
    : [];

  if (fullName.length < 2) fieldErrors.fullName = 'Enter your full name (at least 2 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = 'Enter a valid business email address.';
  }

  let parsedWebsite;
  try {
    parsedWebsite = new URL(websiteUrl);
  } catch {
    parsedWebsite = null;
  }
  if (!parsedWebsite || !['http:', 'https:'].includes(parsedWebsite.protocol) ||
    !parsedWebsite.hostname || parsedWebsite.username || parsedWebsite.password) {
    fieldErrors.websiteUrl = 'Enter a valid website URL starting with https:// or http://.';
  }

  if (!services.length || services.some(service => !availableServices.has(service))) {
    fieldErrors.services = 'Select at least one listed service.';
  }
  if (projectDetails.length < 10) {
    fieldErrors.projectDetails = 'Tell us a little more about your project (at least 10 characters).';
  }
  if (payload.consent !== true) {
    fieldErrors.consent = 'Consent is required so we can respond to your inquiry.';
  }

  return {
    fieldErrors,
    lead: {
      fullName,
      email,
      websiteUrl: parsedWebsite ? parsedWebsite.href : websiteUrl,
      businessName,
      phone,
      services,
      budget,
      projectDetails
    }
  };
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clientIp(req) {
  const realIp = req.headers['x-real-ip'];
  return typeof realIp === 'string' && realIp.trim() ? realIp.trim() : 'unknown';
}

function retentionSeconds() {
  const configured = process.env.SPECIAL_OFFER_LEAD_RETENTION_DAYS;
  const days = configured === undefined || configured === '' ? 365 : Number(configured);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw new Error('Special offer lead retention must be between 1 and 3650 days.');
  }
  return days * 86400;
}

async function redisCommand(command) {
  const configuredUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!configuredUrl || !token) throw new Error('Upstash Redis is not configured.');

  const url = new URL(configuredUrl);
  if (url.protocol !== 'https:') throw new Error('Upstash Redis REST URL must use HTTPS.');

  const response = await fetch(url.toString().replace(/\/+$/, ''), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(8000)
  });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error('Upstash Redis request failed.');
  return result.result;
}

async function updateSubmissionState(key, state, ttl) {
  await redisCommand(['SET', key, state, 'EX', String(ttl)]);
}

function emailBody(record) {
  const submittedAt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(record.submittedAt));
  return [
    'New Lead — 50% OFF Special Offer',
    '',
    `Full name: ${record.fullName}`,
    `Business email: ${record.email}`,
    `Website URL: ${record.websiteUrl}`,
    `Selected services: ${record.services.join(', ')}`,
    `Business name: ${record.businessName || 'Not provided'}`,
    `Phone / WhatsApp: ${record.phone || 'Not provided'}`,
    `Approximate budget: ${record.budget || 'Not provided'}`,
    '',
    'Project details / main problem:',
    record.projectDetails,
    '',
    `Submitted: ${submittedAt} UTC`
  ].join('\n');
}

async function sendNotification(record) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Resend is not configured.');

  const from = process.env.MAIL_FROM || 'Premium Developers <hello@premiumdevelopers.co>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `special-offer-${record.submissionId}`
    },
    body: JSON.stringify({
      from,
      to: recipients,
      reply_to: record.email,
      subject: 'New Lead — 50% OFF Special Offer',
      text: emailBody(record)
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    console.error('Special offer email delivery failed with status:', response.status);
    throw new Error('Email delivery failed.');
  }
}

module.exports = async function specialOffer(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Request could not be verified.' });
  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    return sendJson(res, 415, { error: 'Unsupported request format.' });
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return sendJson(res, 400, { error: 'Please check your inquiry and try again.' });
  }
  if (clean(payload.website, 200)) {
    return sendJson(res, 400, { error: 'Please check your inquiry and try again.' });
  }
  if (!Number.isFinite(Number(payload.elapsedMs)) || Number(payload.elapsedMs) < 2500) {
    return sendJson(res, 400, { error: 'Please take a moment to review your inquiry before sending.' });
  }

  const submissionId = clean(payload.submissionId, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
    return sendJson(res, 400, {
      error: 'Refresh the page and try again.',
      fieldErrors: { form: 'Refresh the page before submitting your inquiry.' }
    });
  }

  const { fieldErrors, lead } = validate(payload);
  if (Object.keys(fieldErrors).length) {
    return sendJson(res, 400, { error: 'Please check the highlighted fields.', fieldErrors });
  }

  const record = {
    ...lead,
    submissionId,
    submittedAt: new Date().toISOString()
  };
  const notifyWithoutDatabase = async () => {
    console.error('Special offer lead storage is unavailable; attempting delivery to the configured inboxes.');
    try {
      await sendNotification(record);
      return sendJson(res, 200, { ok: true, storage: 'email' });
    } catch (error) {
      console.error('Special offer could not be stored or delivered:', error);
      return sendJson(res, 503, {
        error: 'We couldn’t send your inquiry right now. Please try again, or email hello@premiumdevelopers.co and mention the 50% offer.'
      });
    }
  };

  let retention;
  try {
    retention = retentionSeconds();
  } catch (error) {
    console.error('Special offer lead retention is misconfigured:', error);
    return notifyWithoutDatabase();
  }
  const ipHash = createHash('sha256').update(clientIp(req)).digest('hex');
  const submissionKey = `special-offer:submission:${submissionId}`;
  let reservation;
  try {
    reservation = Number(await redisCommand([
      'EVAL',
      reservationScript,
      '2',
      submissionKey,
      `special-offer:rate:${ipHash}`,
      '5'
    ]));
  } catch (error) {
    console.error('Special offer lead reservation failed:', error);
    return notifyWithoutDatabase();
  }

  if (reservation === 2) return sendJson(res, 200, { ok: true, duplicate: true });
  if (reservation === 3) {
    return sendJson(res, 409, { error: 'Your inquiry is still being processed. Wait a moment before retrying.' });
  }
  if (reservation < 0) {
    return sendJson(res, 429, { error: 'Too many inquiries from this connection. Please try again later.' });
  }

  const now = Date.now();
  try {
    await redisCommand([
      'EVAL',
      storeLeadScript,
      '2',
      'special-offer:submissions',
      `special-offer:lead:${submissionId}`,
      JSON.stringify(record),
      String(now - retention * 1000),
      String(retention),
      String(now),
      submissionId
    ]);
  } catch (error) {
    console.error('Special offer lead could not be stored in Redis:', error);
    try {
      await redisCommand(['DEL', submissionKey]);
    } catch (releaseError) {
      console.error('Could not release a special offer submission reservation:', releaseError);
    }
    return notifyWithoutDatabase();
  }

  try {
    await sendNotification(record);
  } catch (error) {
    console.error('Special offer notification failed; the lead remains stored.');
    try {
      await updateSubmissionState(submissionKey, 'stored', 604800);
    } catch (stateError) {
      console.error('Could not update the stored special offer lead status:', stateError);
    }
    return sendJson(res, 503, {
      error: 'Your inquiry was saved, but email notifications could not be sent right now. Please try again shortly.',
      leadStored: true
    });
  }

  try {
    await updateSubmissionState(submissionKey, 'sent', 31536000);
  } catch (error) {
    console.error('Special offer notifications were sent but the completion state could not be stored:', error);
    return sendJson(res, 503, {
      error: 'Your inquiry was saved, but we could not confirm notification status. Please contact us if you do not hear back.',
      leadStored: true
    });
  }
  return sendJson(res, 200, { ok: true });
};
