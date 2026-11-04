#!/usr/bin/env node
/**
 * Applies consent + tracking assets site-wide; removes duplicate analytics.js tags.
 */
const fs = require('node:fs');
const path = require('node:path');
const { gtmHead, trackingStylesLink, trackingScriptsAfterAnalytics } = require('../lib/tracking-snippets');

const root = path.join(__dirname, '..');

const CONSENT_MARKER = 'consent-default.js';
const COOKIE_CSS = '/cookie-consent.css';
const COOKIE_JS = '/cookie-consent.js';

const GTM_BLOCK_RE =
  /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g;

function walkHtml(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git') continue;
      walkHtml(full, files);
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function patchFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (GTM_BLOCK_RE.test(html) && !html.includes(CONSENT_MARKER)) {
    html = html.replace(GTM_BLOCK_RE, gtmHead().trim());
    changed = true;
  }

  if (!html.includes(COOKIE_CSS) && html.includes('whatsapp-button.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="[^"]*whatsapp-button\.css">)/,
      `$1\n  <link rel="stylesheet" href="${COOKIE_CSS}">`
    );
    changed = true;
  } else if (!html.includes(COOKIE_CSS) && html.includes('legal-pages.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="[^"]*legal-pages\.css">)/,
      `$1\n  <link rel="stylesheet" href="${COOKIE_CSS}">`
    );
    changed = true;
  } else if (!html.includes(COOKIE_CSS) && html.includes('/blog/blog.css')) {
    html = html.replace(
      /(<link rel="stylesheet" href="\/blog\/blog\.css">)/,
      `$1\n  <link rel="stylesheet" href="${COOKIE_CSS}">`
    );
    changed = true;
  }

  const analyticsMatches = html.match(/<script src="\/analytics\.js"><\/script>/g);
  if (analyticsMatches && analyticsMatches.length > 1) {
    let seen = false;
    html = html.replace(/<script src="\/analytics\.js"><\/script>\s*/g, (match) => {
      if (seen) {
        changed = true;
        return '';
      }
      seen = true;
      return match;
    });
  }

  if (html.includes('/analytics.js') && !html.includes(COOKIE_JS)) {
    html = html.replace(
      /(<script src="\/analytics\.js"><\/script>)/,
      `$1\n${trackingScriptsAfterAnalytics().trim()}`
    );
    changed = true;
  }

  if (!html.includes('data-pd-open-cookie-settings')) {
    const footerTerms = html.match(/<a href="(?:\/|)terms-and-conditions\.html"[^>]*>\s*Terms\s*<\/a>/);
    if (footerTerms) {
      html = html.replace(
        footerTerms[0],
        `${footerTerms[0]}\n        <a href="#" data-pd-open-cookie-settings>Cookie settings</a>`
      );
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('patched', path.relative(root, filePath));
  }
}

for (const file of walkHtml(root)) {
  patchFile(file);
}

console.log('Done.');
