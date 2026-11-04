#!/usr/bin/env node
/**
 * Local Ollama health check — does not publish content or call Vercel.
 */
const fs = require('node:fs');
const path = require('node:path');
const { detectHardware } = require('../ai/hardware');

const STOP_FILE = path.join(process.cwd(), 'automation', 'STOP');
if (fs.existsSync(STOP_FILE)) {
  console.log('Blog automation is stopped (automation/STOP present). Remove STOP to run checks again.');
  process.exit(0);
}
const { recommendModels } = require('../ai/recommend');
const { OllamaProvider, loadConfig } = require('../ai/provider');
const { AiProviderError } = require('../ai/errors');

async function main() {
  const hardware = await detectHardware();
  const recommendation = recommendModels(hardware);
  console.log('=== Hardware (summary) ===');
  console.log(JSON.stringify(recommendation.summary, null, 2));
  if (recommendation.warnings.length) {
    console.log('\nWarnings:');
    recommendation.warnings.forEach((w) => console.log(`- ${w}`));
  }
  console.log('\nSuggested primary model:', recommendation.primary || '(none)');
  console.log('Suggested fallback (manual config only):', recommendation.fallback || '(none)');

  const configPath = process.env.PD_AUTOMATION_CONFIG || path.join(process.cwd(), 'automation', 'config.local.json');
  let provider;
  try {
    provider = OllamaProvider.fromFile(configPath);
  } catch (err) {
    console.log('\nConfig:', err.message);
    console.log('Copy automation/config.example.json → automation/config.local.json after you approve model install.');
    process.exit(2);
  }

  console.log('\n=== Ollama diagnose ===');
  const diag = await provider.diagnose();
  console.log(JSON.stringify(diag, null, 2));
  if (!diag.ollamaReachable) {
    process.exit(3);
  }
  if (!diag.configuredModelInstalled) {
    process.exit(4);
  }
  console.log('\nOllama OK — configured model is installed.');
}

main().catch((err) => {
  if (err instanceof AiProviderError) {
    console.error(`[${err.code}] ${err.message}`);
    if (err.details) console.error(JSON.stringify(err.details, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
