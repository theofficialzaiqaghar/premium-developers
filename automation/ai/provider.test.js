const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { OllamaProvider, loadConfig } = require('./provider');
const { AiProviderError, CODES } = require('./errors');
const { recommendModels } = require('./recommend');

function tempConfig(obj) {
  const file = path.join(os.tmpdir(), `pd-automation-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(obj));
  return file;
}

test('loadConfig rejects non-localhost Ollama URL', () => {
  const file = tempConfig({ ollamaBaseUrl: 'http://192.168.1.5:11434', model: 'test' });
  assert.throws(() => loadConfig(file), (err) => err instanceof AiProviderError && err.code === CODES.NOT_CONFIGURED);
  fs.unlinkSync(file);
});

test('ping succeeds when Ollama responds', async () => {
  const file = tempConfig({ model: 'llama3.2:3b' });
  const provider = new OllamaProvider(loadConfig(file), {
    fetchImpl: async (url) => {
      assert.match(url, /127\.0\.0\.1:11434\/api\/tags/);
      return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b' }] }) };
    }
  });
  const pong = await provider.ping();
  assert.equal(pong.ok, true);
  fs.unlinkSync(file);
});

test('generate fails when model is missing (no substitution)', async () => {
  const file = tempConfig({ model: 'llama3.2:3b' });
  const provider = new OllamaProvider(loadConfig(file), {
    fetchImpl: async (url) => {
      if (String(url).includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [{ name: 'gemma2:2b' }] }) };
      }
      throw new Error('should not generate');
    }
  });
  await assert.rejects(
    () => provider.generate({ prompt: 'hello' }),
    (err) => err instanceof AiProviderError && err.code === CODES.MODEL_NOT_FOUND
  );
  fs.unlinkSync(file);
});

test('generate returns text on success', async () => {
  const file = tempConfig({ model: 'llama3.2:3b', requestTimeoutMs: 5000 });
  const provider = new OllamaProvider(loadConfig(file), {
    fetchImpl: async (url, init) => {
      if (String(url).includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b' }] }) };
      }
      if (String(url).includes('/api/generate')) {
        return { ok: true, json: async () => ({ response: 'Sample output.', done: true }) };
      }
      throw new Error(`unexpected ${url}`);
    }
  });
  const result = await provider.generate({ prompt: 'test', maxTokens: 10 });
  assert.equal(result.response, 'Sample output.');
  fs.unlinkSync(file);
});

test('unavailable service throws UNAVAILABLE', async () => {
  const file = tempConfig({ model: 'llama3.2:3b' });
  const provider = new OllamaProvider(loadConfig(file), {
    fetchImpl: async () => {
      throw new Error('ECONNREFUSED');
    }
  });
  await assert.rejects(() => provider.ping(), (err) => err instanceof AiProviderError && err.code === CODES.UNAVAILABLE);
  fs.unlinkSync(file);
});

test('generation timeout throws TIMEOUT', async () => {
  const file = tempConfig({ model: 'llama3.2:3b', requestTimeoutMs: 20 });
  const provider = new OllamaProvider(loadConfig(file), {
    fetchImpl: async (url, init) => {
      if (String(url).includes('/api/tags')) {
        return { ok: true, json: async () => ({ models: [{ name: 'llama3.2:3b' }] }) };
      }
      return new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
          return;
        }
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    }
  });
  await assert.rejects(
    () => provider.generate({ prompt: 'slow', timeoutMs: 30 }),
    (err) => err instanceof AiProviderError && err.code === CODES.TIMEOUT
  );
  fs.unlinkSync(file);
});

test('recommendation for 8GB class hardware prefers llama3.2:3b', () => {
  const rec = recommendModels({
    memory: { totalMb: 8192, freeMb: 2400 },
    gpus: [{ name: 'Test GPU', vramMb: 1024 }],
    disks: [{ drive: 'C:', freeGb: 4.5, sizeGb: 68 }]
  });
  assert.equal(rec.primary, 'llama3.2:3b');
  assert.ok(rec.warnings.some((w) => /C:/i.test(w)));
});
