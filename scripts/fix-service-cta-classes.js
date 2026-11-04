const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '..', 'services');
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.html'))) {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/class="([^"]+)"([^>]*?) class="pd-lead-cta"/gi, 'class="$1 pd-lead-cta"$2');
  html = html.replace(/(<script src="\/analytics\.js"><\/script>\s*)+/g, '<script src="/analytics.js"></script>\n');
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('fixed', file);
}
