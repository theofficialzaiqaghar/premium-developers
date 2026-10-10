const recipient = process.env.CONTACT_TO || 'hello@premiumdevelopers.co';
const requestLimits = new Map();
const rateLimitWindowMs = 10 * 60 * 1000;
const maxRequestsPerWindow = 5;
const mailEndpoint = 'https://api.resend.com/emails';
const availableServices = [
  'WordPress Development',
  'Elementor Development',
  'WooCommerce Development',
  'Website Redesign',
  'Custom Development',
  'Landing Pages',
  'Speed & Performance',
  'Maintenance & Support'
];

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function validate(payload) {
  const fieldErrors = {};
  const name = clean(payload.name, 100);
  const email = clean(payload.email, 254);
  const reason = clean(payload.reason, 60);
  const message = clean(payload.message, 5000);
  const services = Array.isArray(payload.services)
    ? [...new Set(payload.services.map(service => clean(service, 80)).filter(Boolean))]
    : [];
  const promoCode = clean(payload.promoCode, 100);

  if (name.length < 2) fieldErrors.name = 'Enter your name (at least 2 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Enter a valid email address.';
  if (!['General inquiry', 'Project discussion'].includes(reason)) {
    fieldErrors.reason = 'Choose a reason for your message.';
  }
  if (message.length < 10) fieldErrors.message = 'Please add a little more detail (at least 10 characters).';
  if (reason === 'Project discussion') {
    if (!services.length) fieldErrors.services = 'Select at least one service you’re interested in.';
    else if (services.some(service => !availableServices.includes(service))) {
      fieldErrors.services = 'Choose services from the list.';
    }
  }

  return { fieldErrors, name, email, reason, message, services, promoCode };
}

function clientIp(req) {
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();

  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',').pop().trim() : 'unknown';
}

function isRateLimited(ip, now = Date.now()) {
  const previous = requestLimits.get(ip) || [];
  const recent = previous.filter(timestamp => now - timestamp < rateLimitWindowMs);
  if (recent.length >= maxRequestsPerWindow) {
    requestLimits.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLimits.set(ip, recent);
  if (requestLimits.size > 1000) {
    for (const [key, timestamps] of requestLimits) {
      if (!timestamps.some(timestamp => now - timestamp < rateLimitWindowMs)) requestLimits.delete(key);
    }
    while (requestLimits.size > 1000) {
      requestLimits.delete(requestLimits.keys().next().value);
    }
  }
  return false;
}

module.exports = async function contact(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) {
    return sendJson(res, 415, { error: 'Unsupported request format.' });
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return sendJson(res, 403, { error: 'Request could not be verified.' });
      }
    } catch {
      return sendJson(res, 403, { error: 'Request could not be verified.' });
    }
  }

  const payload = req.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return sendJson(res, 400, { error: 'Please check your message and try again.' });
  }

  if (clean(payload.website, 200)) {
    return sendJson(res, 200, { ok: true });
  }

  if (Number(payload.elapsedMs) < 2500) {
    return sendJson(res, 400, { error: 'Please take a moment to review your message before sending.' });
  }

  if (isRateLimited(clientIp(req))) {
    return sendJson(res, 429, { error: 'Too many messages were sent from this connection. Please try again in a few minutes.' });
  }

  const { fieldErrors, name, email, reason, message, services, promoCode } = validate(payload);
  if (Object.keys(fieldErrors).length) {
    return sendJson(res, 400, { error: 'Please check the highlighted fields.', fieldErrors });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Contact form is unavailable: RESEND_API_KEY is not configured.');
    return sendJson(res, 503, { error: 'Message delivery is temporarily unavailable.' });
  }

  const from = process.env.MAIL_FROM || 'Premium Developers <hello@premiumdevelopers.co>';
  const phone = clean(payload.phone, 40);
  const company = clean(payload.company, 120);
  const lines = [
    'New website contact inquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Reason: ${reason}`,
    `Phone: ${phone || 'Not provided'}`,
    `Company: ${company || 'Not provided'}`,
  ];
  if (reason === 'Project discussion') {
    lines.push(`Services: ${services.join(', ')}`);
    lines.push(`Promo code: ${promoCode || 'Not provided'}`);
  }
  lines.push('', 'Message:', message);

  try {
    const response = await fetch(mailEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        reply_to: email,
        subject: `Website inquiry: ${reason}`,
        text: lines.join('\n')
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const providerError = await response.text();
      console.error('Contact form email provider rejected the message:', response.status, providerError);
      return sendJson(res, 503, { error: 'Message delivery is temporarily unavailable.' });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('Contact form email delivery request failed:', error);
    return sendJson(res, 503, { error: 'Message delivery is temporarily unavailable.' });
  }
};
