#!/usr/bin/env node
/**
 * SEO technical fixes: root-absolute breadcrumbs, Organization sameAs in JSON-LD.
 */
const fs = require('node:fs');
const path = require('node:path');
const { organizationSameAsBlockJson } = require('../lib/seo-jsonld');

const root = path.join(__dirname, '..');
const ORG_IMAGE_MARKER =
  '"image": "https://www.premiumdevelopers.co/assets/images/og/premium-developers-og.jpg"';
const SAMEAS_INJECT = organizationSameAsBlockJson('      ') + '      ' + ORG_IMAGE_MARKER;

function walkHtml(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'admin') continue;
      walkHtml(full, files);
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

let count = 0;
for (const file of walkHtml(root)) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  const nextBreadcrumbs = html
    .replace(/href="\.\.\/index\.html"/g, 'href="/"')
    .replace(/href="\.\.\/services\.html"/g, 'href="/services.html"')
    .replace(/href="\.\.\/index\.html#work"/g, 'href="/#work"');
  if (nextBreadcrumbs !== html) {
    html = nextBreadcrumbs;
    changed = true;
  }

  if (
    html.includes('"@id": "https://www.premiumdevelopers.co/#organization"') &&
    html.includes(ORG_IMAGE_MARKER) &&
    !html.includes('"sameAs":') &&
    html.includes('application/ld+json')
  ) {
    html = html.replace(ORG_IMAGE_MARKER, SAMEAS_INJECT);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
    count += 1;
  }
}
console.log(`SEO patch: updated ${count} HTML files.`);
