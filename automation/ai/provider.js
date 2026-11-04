const fs = require('node:fs');
const path = require('node:path');
const { AiProviderError, CODES } = require('./errors');

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_GENERATE_TIMEOUT_MS = 120000;
const DEFAULT_CONNECT_TIMEOUT_MS = 8000;

function loadConfig(configPath) {
  const resolved =
    configPath ||
    process.env.PD_AUTOMATION_CONFIG ||
    path.join(process.cwd(), 'automation', 'config.local.json');

  if (!fs.existsSync(resolved)) {
    throw new AiProviderError(CODES.NOT_CONFIGURED, 'Automation config not found.', {
      expectedPath: resolved,
      hint: 'Copy automation/config.example.json to automation/config.local.json'
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (cause) {
    throw new AiProviderError(CODES.NOT_CONFIGURED, 'Automation config JSON is invalid.', { path: resolved, cause: String(cause) });
  }

  const baseUrl = String(parsed.ollamaBaseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl) && !/^http:\/\/localhost:\d+$/.test(baseUrl)) {
    throw new AiProviderError(CODES.NOT_CONFIGURED, 'Ollama base URL must stay on localhost (127.0.0.1 or localhost).', {
      ollamaBaseUrl: baseUrl
    });
  }

  const model = String(parsed.model || '').trim();
  if (!model) {
    throw new AiProviderError(CODES.NOT_CONFIGURED, 'Config must set "model" to an installed Ollama model name.');
  }

  return {
    configPath: resolved,
    ollamaBaseUrl: baseUrl,
    model,
    fallbackModel: String(parsed.fallbackModel || '').trim(),
    requestTimeoutMs: Number(parsed.requestTimeoutMs) || DEFAULT_GENERATE_TIMEOUT_MS,
    connectTimeoutMs: Number(parsed.connectTimeoutMs) || DEFAULT_CONNECT_TIMEOUT_MS
  };
}

class OllamaProvider {
  /**
   * @param {object} config from loadConfig()
   * @param {{ fetchImpl?: typeof fetch }} [options]
   */
  constructor(config, options = {}) {
    this.config = config;
    this.fetchImpl = options.fetchImpl || fetch;
  }

  static fromFile(configPath, options) {
    return new OllamaProvider(loadConfig(configPath), options);
  }

  async request(pathname, { method = 'GET', body, timeoutMs } = {}) {
    const url = `${this.config.ollamaBaseUrl}${pathname}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs ?? this.config.connectTimeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new AiProviderError(CODES.UNAVAILABLE, 'Ollama request failed.', {
          status: response.status,
          body: text.slice(0, 500)
        });
      }
      return response;
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      if (err?.name === 'AbortError') {
        throw new AiProviderError(CODES.TIMEOUT, 'Ollama request timed out.', { url, timeoutMs });
      }
      throw new AiProviderError(CODES.UNAVAILABLE, 'Ollama is not reachable at localhost.', {
        url,
        cause: String(err.message || err)
      });
    } finally {
      clearTimeout(timer);
    }
  }

  async ping() {
    await this.request('/api/tags', { timeoutMs: this.config.connectTimeoutMs });
    return { ok: true, baseUrl: this.config.ollamaBaseUrl };
  }

  async listModels() {
    const response = await this.request('/api/tags');
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models.map((m) => m.name || m.model).filter(Boolean) : [];
    return models;
  }

  modelIsInstalled(modelName, installedList) {
    const target = String(modelName).trim();
    return installedList.some((name) => name === target || name.startsWith(`${target}:`) || target.startsWith(`${name}:`));
  }

  async assertModelAvailable(modelName) {
    const installed = await this.listModels();
    if (this.modelIsInstalled(modelName, installed)) {
      return { model: modelName, installed };
    }
    throw new AiProviderError(CODES.MODEL_NOT_FOUND, `Ollama model "${modelName}" is not installed.`, {
      model: modelName,
      installed,
      hint: `Run manually after approval: ollama pull ${modelName}`
    });
  }

  resolveModelForRequest(explicitModel) {
    return String(explicitModel || this.config.model).trim();
  }

  async generate(options = {}) {
    const model = this.resolveModelForRequest(options.model);
    await this.assertModelAvailable(model);

    const prompt = String(options.prompt || '').trim();
    if (!prompt) {
      throw new AiProviderError(CODES.GENERATION_FAILED, 'Prompt is required.');
    }

    const timeoutMs = Number(options.timeoutMs) || this.config.requestTimeoutMs;
    const body = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 256
      }
    };
    if (options.system) body.system = String(options.system);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.config.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        if (/memory|cuda|gpu|allocate|resource/i.test(text)) {
          throw new AiProviderError(CODES.INSUFFICIENT_RESOURCES, 'Ollama reported insufficient memory or GPU resources.', {
            status: response.status,
            body: text.slice(0, 500)
          });
        }
        throw new AiProviderError(CODES.GENERATION_FAILED, 'Ollama generation failed.', {
          status: response.status,
          body: text.slice(0, 500)
        });
      }
      const data = await response.json();
      return {
        model,
        response: data.response || '',
        done: Boolean(data.done),
        totalDuration: data.total_duration,
        evalCount: data.eval_count
      };
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      if (err?.name === 'AbortError') {
        throw new AiProviderError(CODES.TIMEOUT, 'Ollama generation timed out.', { model, timeoutMs });
      }
      throw new AiProviderError(CODES.GENERATION_FAILED, 'Ollama generation failed.', { cause: String(err.message || err) });
    } finally {
      clearTimeout(timer);
    }
  }

  async diagnose() {
    const out = {
      baseUrl: this.config.ollamaBaseUrl,
      configuredModel: this.config.model,
      ollamaReachable: false,
      installedModels: [],
      configuredModelInstalled: false,
      messages: []
    };
    try {
      out.installedModels = await this.listModels();
      out.ollamaReachable = true;
    } catch (err) {
      out.messages.push(err.message);
      return out;
    }
    out.configuredModelInstalled = this.modelIsInstalled(this.config.model, out.installedModels);
    if (!out.configuredModelInstalled) {
      out.messages.push(`Configured model "${this.config.model}" is not installed.`);
    }
    return out;
  }
}

module.exports = {
  OllamaProvider,
  loadConfig,
  DEFAULT_BASE_URL
};
