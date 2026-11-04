#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'content', 'blog-seo-pack', 'bodies');
for (const name of fs.readdirSync(dir)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(dir, name);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/\n?  <link rel="stylesheet" href="\/whatsapp-button\.css">/g, '');
  html = html.replace(
    /\n?  <script src="\/whatsapp-config\.js"><\/script>\n  <script src="\/whatsapp-button\.js" defer><\/script>/g,
    ''
  );
  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    console.log('reverted', name);
  }
}
