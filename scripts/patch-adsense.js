#!/usr/bin/env node
/**
 * Inserts Google AdSense loader in <head> after GTM (once per page).
 */
const fs = require('node:fs');
const path = require('node:path');
const { adsenseHead } = require('../lib/tracking-snippets');

const root = path.join(__dirname, '..');
const MARKER = 'adsbygoogle.js?client=ca-pub-7106840681244658';
const INSERT_AFTER = '<!-- End Google Tag Manager -->';

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

const block = `\n${adsenseHead()}`;
const patched = [];

const GTM_SCRIPT_END =
  "})(window,document,'script','dataLayer','GTM-WF285DKZ');</script>";

for (const file of walkHtml(root)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('<head') || html.includes(MARKER)) continue;
  if (html.includes(INSERT_AFTER)) {
    html = html.replace(INSERT_AFTER, `${INSERT_AFTER}${block}`);
  } else if (html.includes(GTM_SCRIPT_END)) {
    html = html.replace(GTM_SCRIPT_END, `${GTM_SCRIPT_END}${block}`);
  } else {
    continue;
  }
  fs.writeFileSync(file, html, 'utf8');
  patched.push(path.relative(root, file));
}

console.log(`AdSense: patched ${patched.length} HTML files.`);
patched.forEach((p) => console.log('  ', p));
