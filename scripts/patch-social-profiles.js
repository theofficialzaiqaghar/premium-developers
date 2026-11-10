#!/usr/bin/env node
/**
 * Replaces footer .socials blocks with canonical profile links from lib/social-profiles.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { siteChromeSocialLinksHtml } = require('../lib/social-profiles');

const root = path.join(__dirname, '..');
const SOCIALS_RE = /<div class="socials">[\s\S]*?<\/div>(?=\s*<\/div>\s*<div class="fcol">)/;

const SOCIAL_ICON_SYMBOLS = `      <symbol id="i-linkedin" viewBox="0 0 24 24">
        <g fill="currentColor">
          <path d="M6.94 8.5a1.94 1.94 0 1 1 0-3.88 1.94 1.94 0 0 1 0 3.88zM5.25 10.13h3.38v9.37H5.25V10.13zM13.03 10.13h3.24v1.28h.05c.45-.85 1.55-1.75 3.19-1.75 3.41 0 4.04 2.12 4.04 4.88v5.96h-3.38v-5.28c0-1.26-.02-2.88-1.76-2.88-1.76 0-2.03 1.37-2.03 2.79v5.37h-3.35V10.13z" />
        </g>
      </symbol>
      <symbol id="i-facebook" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 8.5h2.5V5h-2.5c-2.48 0-4 1.52-4 4.16V12H8v3.5h1.5V22h3.5v-6.5H16l.5-3.5h-3V9.5c0-1.03.35-1.5 1.5-1.5z" />
      </symbol>
      <symbol id="i-instagram" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </g>
      </symbol>
      <symbol id="i-user" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
        </g>
      </symbol>
`;

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

function isHomePage(filePath) {
  return path.basename(filePath) === 'index.html' && path.dirname(filePath) === root;
}

let patched = 0;
for (const file of walkHtml(root)) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (SOCIALS_RE.test(html)) {
    const links = siteChromeSocialLinksHtml({ isHome: isHomePage(file) });
    const next = html.replace(SOCIALS_RE, `<div class="socials">\n${links}\n        </div>`);
    if (next !== html) {
      html = next;
      changed = true;
    }
  }
  if (html.includes('#i-linkedin') && !html.includes('id="i-linkedin"')) {
    html = html.replace(/(\s*<\/defs>\s*<\/svg>)/, `\n${SOCIAL_ICON_SYMBOLS}    </defs>\n  </svg>`);
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
    patched += 1;
  }
}
console.log(`Patched socials in ${patched} HTML files.`);
