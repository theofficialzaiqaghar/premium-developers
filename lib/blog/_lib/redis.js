const { BlogError, CODES } = require('./errors');

function redisUrl() {
  const value = process.env.UPSTASH_REDIS_REST_URL;
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return url.toString().replace(/\/+$/, '');
}

function isConfigured() {
  return Boolean(redisUrl() && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * @param {string[]} command Redis command argv
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [options]
 */
async function redisCommand(command, options = {}) {
  const url = redisUrl();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new BlogError(CODES.NOT_CONFIGURED, 'Upstash Redis is not configured for the blog CMS.');
  }

  const timeoutMs = options.timeoutMs ?? 12000;
  const fetchImpl = options.fetchImpl ?? fetch;

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (cause) {
    throw new BlogError(CODES.REDIS, 'Upstash Redis request failed.', { cause: String(cause) });
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new BlogError(CODES.REDIS, 'Upstash Redis returned an invalid response.');
  }

  if (!response.ok || result.error) {
    const message = typeof result.error === 'string' ? result.error : 'Upstash Redis request failed.';
    throw new BlogError(CODES.REDIS, message, { status: response.status });
  }

  return result.result;
}

async function ping(options) {
  const pong = await redisCommand(['PING'], options);
  return pong === 'PONG';
}

module.exports = {
  redisUrl,
  isConfigured,
  redisCommand,
  ping
};
