/**
 * Ensures every JSON-LD @graph includes canonical Organization+ProfessionalService
 * and WebSite where applicable. Removes duplicate partial Organization nodes.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const org = JSON.parse(
  await readFile(path.join(root, 'schema/organization-professional-service.json'), 'utf8')
);
const website = JSON.parse(await readFile(path.join(root, 'schema/website.json'), 'utf8'));

const ORG_ID = org['@id'];
const WEB_ID = website['@id'];

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

function isOrgNode(node) {
  if (!node || typeof node !== 'object') return false;
  if (node['@id'] === ORG_ID) return true;
  const t = node['@type'];
  if (t === 'Organization') return true;
  if (Array.isArray(t) && t.includes('Organization')) return true;
  return false;
}

function patchGraph(graph, filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  let next = graph.filter((n) => !isOrgNode(n));

  const orgNode = JSON.parse(JSON.stringify(org));
  if (rel === 'about.html') {
    orgNode.founder = { '@id': 'https://www.premiumdevelopers.co/about#founder' };
  }

  next.unshift(orgNode);

  const needsWebSite =
    rel === 'index.html' ||
    rel === 'services.html' ||
    rel.startsWith('services/') ||
    rel.startsWith('work/') ||
    rel.startsWith('case-studies/') ||
    rel.startsWith('blog/');

  if (needsWebSite && !next.some((n) => n['@id'] === WEB_ID)) {
    next.splice(1, 0, JSON.parse(JSON.stringify(website)));
  }

  for (const node of next) {
    if (node['@type'] === 'CollectionPage' || node['@type'] === 'WebPage') {
      if (!node.isPartOf && rel !== 'index.html') {
        node.isPartOf = { '@id': WEB_ID };
      }
    }
    if (node['@type'] === 'Service' && node.provider?.['@id'] === ORG_ID) {
      node.provider = { '@id': ORG_ID };
    }
  }

  return next;
}

function patchHtml(html, filePath) {
  const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  return html.replace(re, (match, jsonText) => {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch {
      return match;
    }

    if (data['@graph'] && Array.isArray(data['@graph'])) {
      data['@graph'] = patchGraph(data['@graph'], filePath);
    } else if (data['@type'] === 'CollectionPage' || data['@type']) {
      const page = { ...data };
      delete page['@context'];
      data = {
        '@context': 'https://schema.org',
        '@graph': patchGraph([page], filePath),
      };
    } else {
      return match;
    }

    if (!data['@context']) data['@context'] = 'https://schema.org';
    const formatted = JSON.stringify(data, null, 2);
    return `<script type="application/ld+json">\n${formatted}\n  </script>`;
  });
}

const files = await walk(root);
let count = 0;
for (const file of files) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('application/ld+json')) continue;
  const out = patchHtml(html, file);
  if (out !== html) {
    await writeFile(file, out, 'utf8');
    count++;
  }
}
console.log(`Patched JSON-LD in ${count} HTML files.`);
