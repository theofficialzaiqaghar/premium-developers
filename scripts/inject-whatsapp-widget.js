#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const cssLink = '  <link rel="stylesheet" href="/whatsapp-button.css">';
const widgetScripts = `  <script src="/whatsapp-config.js"></script>
  <script src="/whatsapp-button.js" defer></script>`;

function shouldSkip(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, '/');
  if (rel.startsWith('admin/')) return true;
  if (rel.includes('blog-seo-pack/')) return true;
  if (rel.startsWith('node_modules/')) return true;
  return false;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (shouldSkip(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function inject(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('whatsapp-button.js')) return false;

  if (!html.includes('whatsapp-button.css')) {
    if (html.includes('/offer-popup.css')) {
      html = html.replace(
        /(<link rel="stylesheet" href="\/offer-popup\.css">)/,
        `$1\n${cssLink}`
      );
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `${cssLink}\n</head>`);
    }
  }

  if (html.includes('/analytics.js')) {
    html = html.replace(
      /(<script src="\/analytics\.js"><\/script>\n?)/,
      `$1${widgetScripts}\n`
    );
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `  <script src="/analytics.js"></script>\n${widgetScripts}\n</body>`);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

const files = walk(root);
let count = 0;
for (const file of files) {
  if (inject(file)) {
    count += 1;
    console.log('updated', path.relative(root, file));
  }
}
console.log(`Done. Updated ${count} file(s).`);
