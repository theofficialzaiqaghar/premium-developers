const assert = require('node:assert/strict');
const { test } = require('node:test');
const specialOffer = require('./special-offer.js');

const validPayload = {
  submissionId: 'f8a257cf-4d22-42da-9d02-02754e56ffaf',
  fullName: 'A Visitor',
  email: 'visitor@example.com',
  websiteUrl: 'https://example.com',
  businessName: 'Example Business',
  phone: '+1 555 0100',
  services: ['SEO Optimization', 'Content Writing'],
  budget: '$1,000–$2,000',
  projectDetails: 'Our website needs clearer service content and better search visibility.',
  consent: true,
  elapsedMs: 5000
};

const environmentKeys = [
  'RESEND_API_KEY',
  'MAIL_FROM',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SPECIAL_OFFER_LEAD_RETENTION_DAYS'
];

function configure() {
  process.env.RESEND_API_KEY = 'resend-test-key';
  process.env.MAIL_FROM = 'Premium Developers <hello@example.com>';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test-token';
  process.env.SPECIAL_OFFER_LEAD_RETENTION_DAYS = '365';
}

async function request({ method = 'POST', body = validPayload, headers = {} } = {}) {
  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(bodyText) { this.body = bodyText ? JSON.parse(bodyText) : null; }
  };
  await specialOffer({
    method,
    body,
    headers: {
      host: 'example.com',
      origin: 'https://example.com',
      'content-type': 'application/json',
      'x-real-ip': '192.0.2.16',
      ...headers
    }
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

function mockServices({ reservation = 1, emailStatus = 200, redisStatus = 200 } = {}) {
  const emails = [];
  const redisCommands = [];
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push(url);
    if (url === 'https://api.resend.com/emails') {
      const email = JSON.parse(options.body);
      emails.push(email);
      return new Response('{}', { status: emailStatus });
    }
    const command = JSON.parse(options.body);
    redisCommands.push(command);
    if (redisStatus !== 200) return new Response('{}', { status: redisStatus });
    if (command[0] === 'EVAL' && command[1].includes("status == 'sent'")) {
      return new Response(JSON.stringify({ result: reservation }), { status: 200 });
    }
    return new Response(JSON.stringify({ result: 'OK' }), { status: 200 });
  };
  return { emails, redisCommands, calls };
}

test('rejects unsupported methods, cross-origin requests, and missing origins', async () => {
  const wrongMethod = await request({ method: 'GET' });
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.headers.Allow, 'POST');

  const crossOrigin = await request({ headers: { origin: 'https://attacker.example' } });
  assert.equal(crossOrigin.statusCode, 403);

  const missingOrigin = await request({ headers: { origin: undefined } });
  assert.equal(missingOrigin.statusCode, 403);
});

test('rejects invalid content types, honeypots, and fast submissions', async () => {
  const contentType = await request({ headers: { 'content-type': 'text/plain' } });
  assert.equal(contentType.statusCode, 415);

  const honeypot = await request({ body: { ...validPayload, website: 'bot-filled' } });
  assert.equal(honeypot.statusCode, 400);

  const fast = await request({ body: { ...validPayload, elapsedMs: 100 } });
  assert.equal(fast.statusCode, 400);
});

test('validates required fields, email, URL, services, details, and consent', async () => {
  const response = await request({
    body: {
      ...validPayload,
      fullName: ' ',
      email: 'not-an-email',
      websiteUrl: 'javascript:alert(1)',
      services: ['unlisted'],
      projectDetails: 'short',
      consent: false
    }
  });
  assert.equal(response.statusCode, 400);
  assert.ok(response.body.fieldErrors.fullName);
  assert.ok(response.body.fieldErrors.email);
  assert.ok(response.body.fieldErrors.websiteUrl);
  assert.ok(response.body.fieldErrors.services);
  assert.ok(response.body.fieldErrors.projectDetails);
  assert.ok(response.body.fieldErrors.consent);
});

test('stores the complete lead before notifying both configured recipients', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices();
    const response = await request();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true });
    assert.equal(services.calls[0], 'https://redis.example.com');
    assert.equal(services.calls.at(-1), 'https://redis.example.com');
    assert.equal(services.emails.length, 1);
    assert.deepEqual(services.emails[0].to, [
      'hello@premiumdevelopers.co',
      'muhammadsaadullah093@gmail.com'
    ]);
    assert.equal(services.emails[0].reply_to, validPayload.email);
    assert.equal(services.emails[0].subject, 'New Lead — 50% OFF Special Offer');
    assert.equal(services.emails[0].from, 'Premium Developers <hello@example.com>');
    assert.match(services.emails[0].text, /Full name: A Visitor/);
    assert.match(services.emails[0].text, /Business email: visitor@example\.com/);
    assert.match(services.emails[0].text, /Website URL: https:\/\/example\.com\//);
    assert.match(services.emails[0].text, /Selected services: SEO Optimization, Content Writing/);
    assert.match(services.emails[0].text, /Business name: Example Business/);
    assert.match(services.emails[0].text, /Phone \/ WhatsApp: \+1 555 0100/);
    assert.match(services.emails[0].text, /Approximate budget: \$1,000–\$2,000/);
    assert.match(services.emails[0].text, /Our website needs clearer service content/);
    assert.match(services.emails[0].text, /Submitted: .+ UTC/);

    const storedLead = services.redisCommands.find(command =>
      command[0] === 'EVAL' && command[1].includes("redis.call('SET', KEYS[2]")
    );
    assert.ok(storedLead);
    assert.equal(storedLead[2], '2');
    assert.equal(storedLead[3], 'special-offer:submissions');
    assert.equal(storedLead[4], `special-offer:lead:${validPayload.submissionId}`);
    assert.equal(JSON.parse(storedLead[5]).fullName, validPayload.fullName);
    const storeIndex = services.calls.findIndex(url => url === 'https://redis.example.com/');
    const emailIndex = services.calls.findIndex(url => url === 'https://api.resend.com/emails');
    assert.ok(storeIndex < emailIndex);
  });
});

test('returns a stored-lead error when notification delivery fails', async () => {
  await withTestEnvironment(async () => {
    const services = mockServices({ emailStatus: 503 });
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.leadStored, true);
    assert.match(response.body.error, /inquiry was saved/i);
    assert.equal(services.emails.length, 1);
    assert.ok(services.redisCommands.some(command =>
      command[0] === 'EVAL' && command[1].includes("redis.call('SET', KEYS[2]")
    ));
    assert.ok(services.redisCommands.some(command =>
      command[0] === 'SET' && command[2] === 'stored'
    ));
  });
});

test('stores inquiries but does not claim delivery when Resend is not configured', async () => {
  await withTestEnvironment(async () => {
    delete process.env.RESEND_API_KEY;
    const services = mockServices();
    const response = await request();
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.leadStored, true);
    assert.match(response.body.error, /inquiry was saved/i);
    assert.equal(services.emails.length, 0);
    assert.ok(services.redisCommands.some(command =>
      command[0] === 'EVAL' && command[1].includes("redis.call('SET', KEYS[2]")
    ));
  });
});

test('does not notify when durable storage fails and returns idempotent success for completed submissions', async () => {
  await withTestEnvironment(async () => {
    const failedStorage = mockServices({ redisStatus: 503 });
    const storageResponse = await request();
    assert.equal(storageResponse.statusCode, 503);
    assert.equal(failedStorage.emails.length, 0);

    const duplicate = mockServices({ reservation: 2 });
    const duplicateResponse = await request();
    assert.equal(duplicateResponse.statusCode, 200);
    assert.deepEqual(duplicateResponse.body, { ok: true, duplicate: true });
    assert.equal(duplicate.emails.length, 0);
  });
});
