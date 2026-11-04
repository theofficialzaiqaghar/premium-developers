#!/usr/bin/env node
const { detectHardware } = require('../ai/hardware');
const { recommendModels } = require('../ai/recommend');

async function main() {
  const hardware = await detectHardware();
  const recommendation = recommendModels(hardware);
  const report = { hardware, recommendation };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
