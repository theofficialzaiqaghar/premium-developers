#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const before = (html.match(/<article class="card svc">/g) || []).length;

html = html.replace(
  /<article class="card svc">([\s\S]*?)<a href="([^"]+)" class="link">([\s\S]*?)<\/a>\s*<\/article>/g,
  '<a href="$2" class="card svc">$1<span class="link">$3</span></a>'
);

const after = (html.match(/<article class="card svc">/g) || []).length;
const links = (html.match(/<a href="services\/[^"]+" class="card svc">/g) || []).length;
fs.writeFileSync(file, html, 'utf8');
console.log(`Converted ${before - after} service cards (${links} card links).`);
