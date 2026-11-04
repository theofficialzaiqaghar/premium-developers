#!/usr/bin/env node
/**
 * Short local generation test — never touches the public blog.
 * Requires Ollama running + config.local.json + installed model.
 */
const fs = require('node:fs');
const path = require('node:path');
const { OllamaProvider } = require('../ai/provider');

const STOP_FILE = path.join(process.cwd(), 'automation', 'STOP');
if (fs.existsSync(STOP_FILE)) {
  console.log(JSON.stringify({ ok: false, stopped: true, message: 'Blog automation stopped (automation/STOP).' }, null, 2));
  process.exit(0);
}
const { AiProviderError } = require('../ai/errors');

async function main() {
  const configPath = process.env.PD_AUTOMATION_CONFIG || path.join(process.cwd(), 'automation', 'config.local.json');
  const provider = OllamaProvider.fromFile(configPath);
  await provider.ping();
  const result = await provider.generate({
    prompt: 'Reply with exactly one short sentence about WordPress performance best practices.',
    maxTokens: 80,
    timeoutMs: 90000
  });
  console.log(JSON.stringify({ ok: true, model: result.model, preview: result.response.slice(0, 200) }, null, 2));
}

main().catch((err) => {
  if (err instanceof AiProviderError) {
    console.error(JSON.stringify({ ok: false, code: err.code, message: err.message, details: err.details }, null, 2));
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
