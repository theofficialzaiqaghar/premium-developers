#!/usr/bin/env node
/** Adds service conversion CSS/JS to all service HTML pages. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'services');
const hub = path.join(root, 'services.html');

const cssTag = '  <link rel="stylesheet" href="/service-conversion.css">';
const configScript = '  <script src="/service-conversion-config.js"></script>';
const conversionScript = '  <script src="/service-conversion.js" defer></script>';
const exitScript = '  <script src="/service-exit-prompt.js" defer></script>';

function patch(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('service-conversion-config.js') && html.includes('service-exit-prompt.js')) {
    return false;
  }

  if (!html.includes('service-conversion.css')) {
    html = html.replace(
      '<link rel="stylesheet" href="/whatsapp-button.css">',
      `<link rel="stylesheet" href="/whatsapp-button.css">\n${cssTag}`
    );
    if (!html.includes('service-conversion.css')) {
      html = html.replace(
        '<link rel="stylesheet" href="/cookie-consent.css">',
        `${cssTag}\n  <link rel="stylesheet" href="/cookie-consent.css">`
      );
    }
  }

  const injectBlock = `${configScript}\n${conversionScript}\n${exitScript}\n`;
  if (!html.includes('service-conversion-config.js')) {
    html = html.replace(
      '<script src="/whatsapp-config.js"></script>',
      `<script src="/whatsapp-config.js"></script>\n${injectBlock}`
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  return true;
}

let count = 0;
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.html')) continue;
  if (patch(path.join(dir, name))) count += 1;
}
if (patch(hub)) count += 1;

console.log(`Patched ${count} service page(s) with conversion assets.`);
