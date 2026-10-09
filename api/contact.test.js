const assert = require('node:assert/strict');
const { test } = require('node:test');
const contact = require('./contact.js');

const validPayload = {
  name: 'A Visitor',
  email: 'visitor@example.com',
  reason: 'General inquiry',
  message: 'I would like to ask a question.',
  elapsedMs: 5000
};

async function request({ method = 'POST', body = validPayload, headers = {} } = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(bodyText) { this.body = bodyText ? JSON.parse(bodyText) : null; }
  };
  await contact({
    method,
    body,
    headers: { host: 'localhost', 'content-type': 'application/json', ...headers }
  }, response);
  return response;
}

test('rejects methods other than POST', async () => {
  const response = await request({ method: 'GET' });
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
});

test('rejects cross-origin requests and very fast automated submissions', async () => {
  const originResponse = await request({ headers: { origin: 'https://attacker.example' } });
  assert.equal(originResponse.statusCode, 403);

  const fastResponse = await request({ body: { ...validPayload, elapsedMs: 100 } });
  assert.equal(fastResponse.statusCode, 400);
});

test('silently accepts honeypot submissions without sending email', async () => {
  const previousFetch = global.fetch;
  global.fetch = async () => { throw new Error('honeypot must not send'); };
  try {
    const response = await request({ body: { ...validPayload, website: 'bot-filled' } });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true });
  } finally {
    global.fetch = previousFetch;
  }
});

test('returns field-specific validation errors', async () => {
  const response = await request({ body: { ...validPayload, email: 'invalid' } });
  assert.equal(response.statusCode, 400);
  assert.match(response.body.fieldErrors.email, /valid email/i);
});

test('returns an explicit configuration error without leaking details', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, { error: 'Message delivery is temporarily unavailable.' });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('sends one inquiry to the configured inbox and never auto-replies', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;
  let outgoing;
  process.env.RESEND_API_KEY = 'test-key';
  global.fetch = async (url, options) => {
    outgoing = { url, options, payload: JSON.parse(options.body) };
    return new Response(null, { status: 200 });
  };
  try {
    const response = await request();
    assert.equal(response.statusCode, 200);
    assert.equal(outgoing.url, 'https://api.resend.com/emails');
    assert.equal(outgoing.options.headers.Authorization, 'Bearer test-key');
    assert.deepEqual(outgoing.payload.to, ['hello@premiumdevelopers.co']);
    assert.equal(outgoing.payload.reply_to, validPayload.email);
    assert.equal(outgoing.payload.subject, 'Website inquiry: General inquiry');
    assert.equal(outgoing.payload.from, 'Premium Developers <hello@premiumdevelopers.co>');
    assert.equal(outgoing.payload.text.includes(validPayload.message), true);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('does not expose email provider errors to visitors', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;
  process.env.RESEND_API_KEY = 'test-key';
  global.fetch = async () => new Response('private provider diagnostics', { status: 500 });
  try {
    const response = await request({ headers: { 'x-forwarded-for': '192.0.2.200' } });
    assert.equal(response.statusCode, 503);
    assert.equal(JSON.stringify(response.body).includes('private provider diagnostics'), false);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('limits repeated submissions from the same forwarded address', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;
  process.env.RESEND_API_KEY = 'test-key';
  global.fetch = async () => new Response(null, { status: 200 });
  try {
    const headers = { 'x-forwarded-for': '192.0.2.201' };
    for (let index = 0; index < 5; index += 1) {
      const response = await request({ headers });
      assert.equal(response.statusCode, 200);
    }
    const limited = await request({ headers });
    assert.equal(limited.statusCode, 429);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('uses Vercel’s real client IP rather than a spoofed forwarded value', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = global.fetch;
  process.env.RESEND_API_KEY = 'test-key';
  global.fetch = async () => new Response(null, { status: 200 });
  try {
    const headers = { 'x-real-ip': '192.0.2.202' };
    for (let index = 0; index < 5; index += 1) {
      const response = await request({
        headers: { ...headers, 'x-forwarded-for': `spoofed-${index}` }
      });
      assert.equal(response.statusCode, 200);
    }
    const limited = await request({
      headers: { ...headers, 'x-forwarded-for': 'another-spoof' }
    });
    assert.equal(limited.statusCode, 429);
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});
