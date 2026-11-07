#!/usr/bin/env node
/**
 * Generates sitemap.xml (all public URLs) and sitemap/index.html from blog manifest + static routes.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  gtmHead,
  gtmBody,
  trackingStylesLink,
  trackingScriptsAfterAnalytics
} = require('../lib/tracking-snippets');
const { siteChromeIcons, siteChromeNav, siteChromeFooter } = require('../lib/site-chrome');

const root = path.join(__dirname, '..');
const SITE = 'https://www.premiumdevelopers.co';
const manifestPath = path.join(root, 'content', 'blog-seo-pack', 'manifest.json');
const sitemapXmlPath = path.join(root, 'sitemap.xml');
const sitemapBlogPath = path.join(root, 'sitemap-blog.xml');
const htmlSitemapPath = path.join(root, 'sitemap', 'index.html');

const BLOG_DATES = [
  '2025-09-02',
  '2025-09-09',
  '2025-09-16',
  '2025-09-23',
  '2025-09-30',
  '2025-10-07',
  '2025-10-14',
  '2025-10-21',
  '2025-10-28',
  '2025-11-04'
];

const SITE_LASTMOD = '2026-11-08';

const STATIC_PAGES = [
  { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
  { loc: `${SITE}/about`, changefreq: 'monthly', priority: '0.8' },
  { loc: `${SITE}/contact`, changefreq: 'monthly', priority: '0.85' },
  { loc: `${SITE}/services.html`, changefreq: 'monthly', priority: '0.9' },
  { loc: `${SITE}/services/wordpress-development.html`, changefreq: 'monthly', priority: '0.9' },
  { loc: `${SITE}/services/elementor-development.html`, changefreq: 'monthly', priority: '0.9' },
  { loc: `${SITE}/services/woocommerce-development.html`, changefreq: 'monthly', priority: '0.9' },
  { loc: `${SITE}/services/custom-wordpress-plugin-development.html`, changefreq: 'monthly', priority: '0.85' },
  { loc: `${SITE}/services/website-redesign.html`, changefreq: 'monthly', priority: '0.75' },
  { loc: `${SITE}/services/custom-development.html`, changefreq: 'monthly', priority: '0.75' },
  { loc: `${SITE}/services/landing-pages.html`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/services/speed-performance.html`, changefreq: 'monthly', priority: '0.75' },
  { loc: `${SITE}/services/maintenance-support.html`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/services/essential-web.html`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/services/custom-apps.html`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/services/enterprise.html`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/blog/`, changefreq: 'weekly', priority: '0.8' },
  { loc: `${SITE}/case-studies/`, changefreq: 'monthly', priority: '0.7' },
  { loc: `${SITE}/case-studies/the-resumer/`, changefreq: 'yearly', priority: '0.75' },
  { loc: `${SITE}/case-studies/the-lynx-med-spa/`, changefreq: 'yearly', priority: '0.75' },
  { loc: `${SITE}/case-studies/regenerative-wellness-nc/`, changefreq: 'yearly', priority: '0.75' },
  { loc: `${SITE}/case-studies/top-dog-waste/`, changefreq: 'yearly', priority: '0.75' },
  { loc: `${SITE}/work/ajj-vans-canarias.html`, changefreq: 'yearly', priority: '0.65' },
  { loc: `${SITE}/work/routhexit.html`, changefreq: 'yearly', priority: '0.65' },
  { loc: `${SITE}/special-offer/`, changefreq: 'monthly', priority: '0.5' },
  { loc: `${SITE}/sitemap/`, changefreq: 'monthly', priority: '0.4' },
  { loc: `${SITE}/privacy-policy.html`, changefreq: 'yearly', priority: '0.3' },
  { loc: `${SITE}/terms-and-conditions.html`, changefreq: 'yearly', priority: '0.3' }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function xmlEntry({ loc, lastmod, changefreq, priority }) {
  let line = `  <url><loc>${loc}</loc>`;
  if (lastmod) line += `<lastmod>${lastmod}</lastmod>`;
  if (changefreq) line += `<changefreq>${changefreq}</changefreq>`;
  if (priority) line += `<priority>${priority}</priority>`;
  line += '</url>';
  return line;
}

function loadBlogPosts() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest
    .slice()
    .sort((a, b) => a.publishPriority - b.publishPriority)
    .map((entry, i) => ({
      slug: entry.slug,
      title: entry.title,
      loc: `${SITE}/blog/${encodeURIComponent(entry.slug)}/`,
      lastmod: BLOG_DATES[i] || BLOG_DATES[BLOG_DATES.length - 1]
    }));
}

function writeXmlSitemaps(posts) {
  const blogOnly = [
    xmlEntry({ loc: `${SITE}/blog/`, lastmod: posts[0]?.lastmod || SITE_LASTMOD, changefreq: 'weekly', priority: '0.8' }),
    ...posts.map((p) =>
      xmlEntry({ loc: p.loc, lastmod: p.lastmod, changefreq: 'monthly', priority: '0.7' })
    )
  ];

  const mainEntries = [
    ...STATIC_PAGES.map((p) => xmlEntry({ ...p, lastmod: SITE_LASTMOD })),
    ...posts.map((p) =>
      xmlEntry({ loc: p.loc, lastmod: p.lastmod, changefreq: 'monthly', priority: '0.7' })
    )
  ];

  const blogXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blogOnly.join('\n')}\n</urlset>\n`;
  const mainXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mainEntries.join('\n')}\n</urlset>\n`;

  fs.writeFileSync(sitemapBlogPath, blogXml, 'utf8');
  fs.writeFileSync(sitemapXmlPath, mainXml, 'utf8');
  return mainEntries.length;
}

function serviceLinksHtml() {
  const services = STATIC_PAGES.filter((p) => p.loc.includes('/services/') && p.loc.endsWith('.html'));
  return services.map((p) => `<li><a href="${p.loc.replace(SITE, '')}">${escapeHtml(p.loc.split('/').pop().replace('.html', '').replace(/-/g, ' '))}</a></li>`).join('\n');
}

function writeHtmlSitemap(posts) {
  const blogList = posts
    .map((p) => `<li><a href="/blog/${escapeHtml(p.slug)}/">${escapeHtml(p.title)}</a></li>`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="${SITE}/sitemap/">
<title>Site Map | Premium Developers</title>
<meta name="description" content="Browse all important pages on Premium Developers — services, blog articles, case studies, and contact information.">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/service-pages.css">
<link rel="stylesheet" href="/legal-pages.css">
${trackingStylesLink()}
<style>
.sitemap-sections { display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 2rem; }
.sitemap-section h2 { font-size: 1.1rem; margin: 0 0 0.75rem; color: var(--blog-ink, #0b2640); }
.sitemap-section ul { margin: 0; padding-left: 1.1rem; line-height: 1.75; }
.sitemap-xml-note { margin-top: 2rem; padding: 1rem 1.25rem; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
</style>
</head>
<body class="service-page legal-page">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: null })}
<main id="main-content" class="service-wrap" tabindex="-1" style="padding-bottom:4rem">
  <nav class="service-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span aria-current="page">Site map</span></nav>
  <span class="service-kicker">Site map</span>
  <h1>Site map</h1>
  <p>Quick links to every public page on Premium Developers — WordPress, Elementor, WooCommerce, and custom web development for UK and international clients.</p>
  <div class="sitemap-sections">
    <section class="sitemap-section" aria-labelledby="sitemap-home">
      <h2 id="sitemap-home">Home &amp; company</h2>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/case-studies/">Case studies</a></li>
        <li><a href="/case-studies/the-resumer/">The Resumer case study</a></li>
        <li><a href="/case-studies/the-lynx-med-spa/">The Lynx Med Spa case study</a></li>
        <li><a href="/case-studies/regenerative-wellness-nc/">Regenerative Wellness NC case study</a></li>
        <li><a href="/case-studies/top-dog-waste/">Top Dog Waste case study</a></li>
      </ul>
    </section>
    <section class="sitemap-section" aria-labelledby="sitemap-services">
      <h2 id="sitemap-services">Services</h2>
      <ul>
        <li><a href="/services.html">All services</a></li>
        ${serviceLinksHtml()}
      </ul>
    </section>
    <section class="sitemap-section" aria-labelledby="sitemap-blog">
      <h2 id="sitemap-blog"><a href="/blog/">Blog</a></h2>
      <ul>
        ${blogList}
      </ul>
    </section>
    <section class="sitemap-section" aria-labelledby="sitemap-legal">
      <h2 id="sitemap-legal">Legal &amp; offers</h2>
      <ul>
        <li><a href="/privacy-policy.html">Privacy policy</a></li>
        <li><a href="/terms-and-conditions.html">Terms and conditions</a></li>
        <li><a href="/special-offer/">Special offer</a></li>
      </ul>
    </section>
  </div>
  <p class="sitemap-xml-note">Search engines: use our <a href="/sitemap.xml">XML sitemap</a> (includes all blog article URLs) and <a href="/sitemap-blog.xml">blog-only XML sitemap</a>.</p>
</main>
${siteChromeFooter()}
<button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><span aria-hidden="true">↑</span></button>
<script src="/script.js" defer></script>
<script src="/analytics.js"></script>
${trackingScriptsAfterAnalytics()}
</body>
</html>`;

  fs.mkdirSync(path.dirname(htmlSitemapPath), { recursive: true });
  fs.writeFileSync(htmlSitemapPath, html, 'utf8');
}

function main() {
  const posts = loadBlogPosts();
  const count = writeXmlSitemaps(posts);
  writeHtmlSitemap(posts);
  console.log(`Sitemap: ${count} URLs in sitemap.xml, ${posts.length} blog articles, HTML at /sitemap/`);
}

main();
