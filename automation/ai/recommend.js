/**
 * Model guidance for local Ollama (approximate; actual RAM use varies by quant and context).
 * Does not download models.
 */

const MODEL_CATALOG = [
  {
    id: 'gemma2:2b',
    tier: 'small',
    ramGbMin: 4,
    ramGbComfort: 6,
    vramGbMin: 0,
    diskGb: 1.6,
    speed: 'fast on CPU',
    quality: 'short drafts; more editing needed'
  },
  {
    id: 'llama3.2:3b',
    tier: 'small',
    ramGbMin: 6,
    ramGbComfort: 8,
    vramGbMin: 0,
    diskGb: 2.0,
    speed: 'moderate on CPU',
    quality: 'good balance for 8 GB systems'
  },
  {
    id: 'phi3:mini',
    tier: 'small',
    ramGbMin: 6,
    ramGbComfort: 8,
    vramGbMin: 0,
    diskGb: 2.3,
    speed: 'moderate',
    quality: 'compact; decent instructions'
  },
  {
    id: 'mistral:7b-instruct-q4_K_M',
    tier: 'medium',
    ramGbMin: 10,
    ramGbComfort: 16,
    vramGbMin: 6,
    diskGb: 4.4,
    speed: 'slow on CPU; better with GPU',
    quality: 'stronger writing; not for 8 GB RAM'
  },
  {
    id: 'llama3.1:8b-instruct-q4_K_M',
    tier: 'medium',
    ramGbMin: 10,
    ramGbComfort: 16,
    vramGbMin: 6,
    diskGb: 4.9,
    speed: 'slow on CPU',
    quality: 'high quality; needs more RAM/VRAM'
  }
];

function summarizeHardware(hardware) {
  const totalRamGb = (hardware.memory?.totalMb || 0) / 1024;
  const freeRamGb = (hardware.memory?.freeMb || 0) / 1024;
  const maxVramMb = Math.max(0, ...(hardware.gpus || []).map((g) => g.vramMb || 0));
  const maxVramGb = maxVramMb / 1024;
  const cDrive = (hardware.disks || []).find((d) => String(d.drive).toUpperCase() === 'C:');
  const freeDiskC = cDrive?.freeGb ?? null;
  return { totalRamGb, freeRamGb, maxVramGb, freeDiskC };
}

function fitsModel(model, summary) {
  if (summary.totalRamGb < model.ramGbMin) return false;
  if (model.vramGbMin > 0 && summary.maxVramGb < model.vramGbMin) return false;
  if (summary.freeDiskC !== null && summary.freeDiskC < model.diskGb + 1) return false;
  return true;
}

function recommendModels(hardware) {
  const summary = summarizeHardware(hardware);
  const suitable = MODEL_CATALOG.filter((m) => fitsModel(m, summary));
  const small = suitable.filter((m) => m.tier === 'small');
  const medium = suitable.filter((m) => m.tier === 'medium');

  let primary = null;
  let fallback = null;
  let warnings = [];

  if (summary.totalRamGb < 6) {
    warnings.push('System RAM is below 6 GB — local LLM generation is not recommended.');
  }
  if (summary.freeRamGb < 2) {
    warnings.push('Free RAM is very low — close other apps before running Ollama.');
  }
  if (summary.freeDiskC !== null && summary.freeDiskC < 5) {
    warnings.push(
      `Drive C: has about ${summary.freeDiskC} GB free — free space before downloading models (Ollama often uses C:).`
    );
  }
  if (summary.maxVramGb > 0 && summary.maxVramGb < 4) {
    warnings.push('Dedicated GPU VRAM is limited — expect CPU-based inference (slower).');
  }

  if (small.length) {
    primary =
      small.find((m) => m.id === 'llama3.2:3b') ||
      small.find((m) => m.id === 'phi3:mini') ||
      small[0];
    fallback =
      small.find((m) => m.id === 'gemma2:2b' && m.id !== primary.id) ||
      small.find((m) => m.id !== primary.id) ||
      null;
  }

  if (!primary && medium.length) {
    primary = medium[0];
    fallback = medium[1] || null;
  }

  if (!primary) {
    warnings.push('No catalog model fits current RAM/VRAM/disk — upgrade RAM or free disk before using Ollama.');
  }

  return {
    summary,
    catalog: MODEL_CATALOG,
    suitable,
    primary: primary ? primary.id : null,
    fallback: fallback ? fallback.id : null,
    warnings,
    notes: [
      'Primary/fallback are suggestions only — set model in automation/config.local.json after you approve downloads.',
      'This layer never auto-downloads models and never switches models without your config change.'
    ]
  };
}

module.exports = { MODEL_CATALOG, recommendModels, summarizeHardware };
