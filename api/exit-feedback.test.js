const assert = require('node:assert/strict');
const { test } = require('node:test');
const exitFeedback = require('./exit-feedback.js');

const validPayload = {
  submissionId: 'f8a257cf-4d22-42da-9d02-02754e56ffaf',
  email: 'visitor@example.com',
  reason: 'Other',
  comments: 'I could not find the portfolio details.',
  consent: false,
  pageUrl: 'https://example.com/services',
  elapsedMs: 5000
};

const environmentKeys = [
  'RESEND_API_KEY',
  'MAIL_FROM',
  'CONTACT_TO',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'EXIT_DISCOUNT_PERCENT',
  'EXIT_DISCOUNT_CODE',
  'EXIT_DISCOUNT_CONFIRMED',
  'EXIT_DISCOUNT_EXPIRES_AT',
  'EXIT_DISCOUNT_EMAIL_SUBJECT',
  'EXIT_DISCOUNT_EMAIL_INTRO',
  'EXIT_FEEDBACK_RETENTION_DAYS'
];

function configure() {
  process.env.RESEND_API_KEY = 'resend-test-key';
  process.env.MAIL_FROM = 'Premium Developers <hello@example.com>';
  process.env.CONTACT_TO = 'team@example.com';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test-token';
  process.env.EXIT_DISCOUNT_PERCENT = '35';
  process.env.EXIT_DISCOUNT_CODE = 'REAL35';
  process.env.EXIT_DISCOUNT_CONFIRMED = 'true';
  process.env.EXIT_DISCOUNT_EXPIRES_AT = '';
  process.env.EXIT_FEEDBACK_RETENTION_DAYS = '365';
}

async function request({ method = 'POST', body = validPayload, headers = {} } = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(bodyText) { this.body = bodyText ? JSON.parse(bodyText) : null; }
  };
  await exitFeedback({
    method,
    body,
    headers: { host: 'example.com', 'content-type': 'application/json', ...headers }
  }, response);
  return response;
}

async function withTestEnvironment(run) {
  const previousEnvironment = Object.fromEntries(
    environmentKeys.map(key => [key, process.env[key]])
  );
  const previousFetch = global.fetch;
  configure();
  try {
    return await run();
  } finally {
    global.fetch = previousFetch;
    for (const key of environmentKeys) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
  }
}

function mockServices({ reservation = 1, providerStatus = 200, redisStatus = 200 } = {}) {
  const emails = [];
  const redisCommands = [];
  global.fetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') {
      const email = JSON.parse(options.body);
      emails.push(email);
      return new Response(null, { status: providerStatus });
    }
    const command = JSON.parse(options.body);
    redisCommands.push(command);
    if (redisStatus !== 200) return new Response('{}', { status: redisStatus });
    const result = command[1].includes("existing == 'done'")
      ? reservation
      : 1;
    return new Response(JSON.stringify({ result }), { status: 200 });
  };
  return { emails, redisCommands };
}

test('rejects unsupported methods and cross-origin requests', async () => {
  const wrongMethod = await request({ method: 'PUT' });
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.Allow, 'GET, POST');

  const crossOrigin = await request({ headers: { origin: 'https://attacker.example' } });
  assert.equal(crossOrigin.statusCode, 403);
});

test('reports whether all offer integrations and a valid code are configured', async () => {
  await withTestEnvironment(async () => {
    const enabled = await request({ method: 'GET' });
    assert.deepEqual(enabled.body, { enabled: true, discountPercent: 35 });

    delete process.env.EXIT_DISCOUNT_CONFIRMED;
    const unconfirmed = await request({ method: 'GET' });
    assert.equal(unconfirmed.body.enabled, false);

    process.env.EXIT_DISCOUNT_CONFIRMED = 'true';
    delete process.env.EXIT_DISCOUNT_CODE;
    const disabled = await request({ method: 'GET' });
    assert.equal(disabled.body.enabled, false);
  });
});

test('fails closed when the discount is missing or expired', async () => {
  await withTestEnvironment(async () => {
    delete process.env.EXIT_DISCOUNT_CODE;
    const missing = await request();
    assert.equal(missing.statusCode, 503);

    process.env.EXIT_DISCOUNT_CODE = 'REAL35';
    process.env.EXIT_DISCOUNT_EXPIRES_AT = '2020-01-01T00:00:00Z';
    const expired = await request();
    assert.equal(expired.statusCode, 503);
  });
});

test('validates email, feedback reason, consent type, page URL, and submission id', async () => {
  const response = await request({
    body: {
      ...validPayload,
      email: 'not-an-email',
      reason: 'Unlisted',
      consent: 'yes',
      pageUrl: 'https://attacker.example/fake',
      submissionId: 'not-a-uuid'
    }
  });
  assert.equal(response.statusCode, 400);
  assert.ok(response.body.fieldErrors.email);
  assert.ok(response.body.fieldErrors.reason);
  assert.ok(response.body.fieldErrors.consent);
  assert.ok(response.body.fieldErrors.pageUrl);
  assert.ok(response.body.fieldErrors.submissionId);
});

test('rejects honeypot, malformed content types, and submissions that are too fast', async () => {
  const contentType = await request({ headers: { 'content-type': 'text/plain' } });
  assert.equal(contentType.statusCode, 415);

  const honeypot = await request({ body: { ...validPayload, website: 'bot' } });
  assert.equal(honeypot.statusCode, 400);

  const fast = await request({ body: { ...validPayload, elapsedMs: 100 } });
  assert.equal(fast.statusCode, 400);

  const missingElapsedTime = await request({
    body: { ...validPayload, elapsedMs: undefined }
  });
  assert.equal(missingElapsedTime.statusCode, 400);
});

test('delivers the configured discount and feedback, then persists a sanitized record', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices();
    const response = await request();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true });
    assert.equal(services.emails.length, 2);
    assert.deepEqual(services.emails[0].to, ['visitor@example.com']);
    assert.match(services.emails[0].text, /35% off code: REAL35/);
    assert.equal(services.emails[1].reply_to, 'visitor@example.com');

    const persist = services.redisCommands.find(command => command[1].includes("redis.call('ZADD'"));
    assert.ok(persist);
    const record = JSON.parse(persist[5]);
    assert.equal(record.email, 'visitor@example.com');
    assert.equal(record.reason, 'Other');
    assert.equal(record.comments, 'I could not find the portfolio details.');
    assert.equal(record.consent, false);
    assert.equal(record.pageUrl, 'https://example.com/services');
    assert.ok(record.submittedAt);
    assert.match(persist[1], /ZREMRANGEBYSCORE/);
  });
});

test('records consent without adding promotional content to the requested-code email', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices();
    const response = await request({ body: { ...validPayload, consent: true } });
    assert.equal(response.statusCode, 200);
    const persist = services.redisCommands.find(command => command[1].includes("redis.call('ZADD'"));
    assert.equal(JSON.parse(persist[5]).consent, true);
    assert.match(services.emails[0].text, /REAL35/);
    assert.equal(services.emails.some(email => /newsletter|marketing list/i.test(email.text)), false);
  });
});

test('returns success for a completed idempotent retry without sending duplicate email', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices({ reservation: 2 });
    const response = await request();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, duplicate: true });
    assert.equal(services.emails.length, 0);
  });
});

test('rejects an in-progress duplicate and applies a server-side rate limit', async () => {
  await withTestEnvironment(async () => {
    const processing = mockServices({ reservation: 3 });
    const duplicate = await request();
    assert.equal(duplicate.statusCode, 409);
    assert.equal(processing.emails.length, 0);

    const limited = mockServices({ reservation: -1 });
    const response = await request({
      body: { ...validPayload, submissionId: 'b198b3e1-255a-4fbc-8d57-fb25179d7018' },
      headers: { 'x-real-ip': '192.0.2.44' }
    });
    assert.equal(response.statusCode, 429);
    assert.equal(limited.emails.length, 0);
  });
});

test('returns an explicit error when email delivery fails and does not claim success', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices({ providerStatus: 503 });
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.ok, undefined);
    assert.equal(services.redisCommands.some(command => command[0] === 'DEL'), true);
  });
});

test('returns an explicit error when durable feedback storage is unavailable', async () => {
  await withTestEnvironment(async () => {
    mockServices({ redisStatus: 503 });
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.ok, undefined);
  });
});
