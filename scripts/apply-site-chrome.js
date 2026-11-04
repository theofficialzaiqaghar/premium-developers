#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { siteChromeIcons, siteChromeNav, siteChromeFooter } = require('../lib/site-chrome');

const root = path.join(__dirname, '..');

function shouldSkip(rel) {
  const n = rel.replace(/\\/g, '/');
  if (n.startsWith('admin/')) return true;
  if (n.includes('blog-seo-pack/')) return true;
  if (n === 'index.html') return true;
  return false;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(root, full);
    if (name === 'node_modules') continue;
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html') && !shouldSkip(rel)) out.push(full);
  }
  return out;
}

function detectActive(relPath) {
  const n = relPath.replace(/\\/g, '/');
  if (n === 'about.html') return 'about';
  if (n === 'contact.html') return 'contact';
  if (n === 'services.html' || n.startsWith('services/')) return 'services';
  if (n.startsWith('blog/')) return 'blog';
  if (n.startsWith('case-studies/') || n.startsWith('work/')) return 'portfolio';
  return null;
}

function replaceHeader(html, opts) {
  const block = `<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}

${siteChromeNav(opts)}

`;
  return html.replace(/<a class="skip-link"[\s\S]*?<\/header>\s*(?=<main)/, block);
}

function replaceFooter(html, opts) {
  const footer = `${siteChromeFooter(opts)}\n\n`;
  if (html.includes('class="service-footer"')) {
    return html.replace(/<footer class="service-footer"[\s\S]*?<\/footer>\s*/, footer);
  }
  return html;
}

function ensureScriptJs(html) {
  if (html.includes('src="/script.js"') || html.includes("src='script.js'")) return html;
  if (html.includes('src="../script.js"')) {
    return html.replace('<script src="../script.js" defer></script>', '<script src="/script.js" defer></script>');
  }
  const tag = '  <script src="/script.js" defer></script>\n';
  if (html.includes('/analytics.js')) {
    return html.replace(/(<script src="\/analytics\.js"><\/script>)/, `${tag}$1`);
  }
  return html.replace('</body>', `${tag}</body>`);
}

function ensureBackToTop(html) {
  if (html.includes('class="back-to-top"')) return html;
  const btn = `  <button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden>
    <svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
  </button>

`;
  return html.replace(/(\s*<footer class="footer">)/, `\n${btn}$1`);
}

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const active = detectActive(rel);
  const opts = { active, isHome: false };
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  if (!html.includes('class="nav" id="nav"')) {
    html = replaceHeader(html, opts);
  }
  if (!html.includes('<footer class="footer">')) {
    html = replaceFooter(html, opts);
  }
  html = ensureScriptJs(html);
  html = ensureBackToTop(html);

  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('updated', rel);
  }
}

console.log('Site chrome apply complete.');
