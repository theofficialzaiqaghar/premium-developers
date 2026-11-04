import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORG_ID = 'https://www.premiumdevelopers.co/#organization';
const WEB_ID = 'https://www.premiumdevelopers.co/#website';

async function walk(dir, acc = []) {
  for (const name of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === 'api') continue;
      await walk(p, acc);
    } else if (name.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const errors = [];
const warnings = [];

for (const file of await walk(root)) {
  const html = await readFile(file, 'utf8');
  const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  let m;
  let blockIndex = 0;
  while ((m = re.exec(html))) {
    blockIndex++;
    const rel = path.relative(root, file).replace(/\\/g, '/');
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      errors.push(`${rel} block ${blockIndex}: invalid JSON (${e.message})`);
      continue;
    }
    const graph = data['@graph'] || (data['@type'] ? [data] : []);
    if (!graph.length) {
      warnings.push(`${rel}: no @graph nodes`);
      continue;
    }
    const ids = new Set(graph.map((n) => n['@id']).filter(Boolean));
    const hasOrg = graph.some(
      (n) => n['@id'] === ORG_ID || n['@type'] === 'Organization' || (Array.isArray(n['@type']) && n['@type'].includes('Organization'))
    );
    if (!hasOrg) {
      errors.push(`${rel}: missing Organization node`);
    }
    for (const node of graph) {
      const checkRef = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj['@id'] && obj['@id'] !== ORG_ID && obj['@id'] !== WEB_ID && !ids.has(obj['@id'])) {
          const externalKnown = obj['@id'].startsWith('https://www.premiumdevelopers.co/about#');
          if (!externalKnown) {
            warnings.push(`${rel}: dangling @id reference ${obj['@id']}`);
          }
        }
        for (const v of Object.values(obj)) {
          if (Array.isArray(v)) v.forEach(checkRef);
          else checkRef(v);
        }
      };
      checkRef(node);
    }
  }
}

console.log(`Validation complete: ${errors.length} error(s), ${warnings.length} warning(s).`);
for (const e of errors) console.log('ERROR:', e);
for (const w of warnings.slice(0, 40)) console.log('WARN:', w);
if (warnings.length > 40) console.log(`... and ${warnings.length - 40} more warnings`);
process.exitCode = errors.length ? 1 : 0;
