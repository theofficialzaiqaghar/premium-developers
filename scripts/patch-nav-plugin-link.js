#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const needle = '<a href="/services/custom-development.html">Custom Development</a>\n            <a href="/services/landing-pages.html">';
const insert =
  '<a href="/services/custom-development.html">Custom Development</a>\n            <a href="/services/custom-wordpress-plugin-development.html">Custom Plugin Development</a>\n            <a href="/services/landing-pages.html">';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'admin') continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

let count = 0;
for (const file of walk(root)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('services-menu') || html.includes('custom-wordpress-plugin-development')) continue;
  const relNeedle = needle.replace(/\/services\//g, 'services/');
  if (html.includes(relNeedle)) {
    html = html.replace(relNeedle, insert.replace(/\/services\//g, 'services/'));
  } else if (html.includes(needle)) {
    html = html.replace(needle, insert);
  } else continue;
  fs.writeFileSync(file, html, 'utf8');
  count += 1;
}
console.log('Nav plugin link added to', count, 'files');
