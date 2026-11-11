#!/usr/bin/env node
/**
 * Builds static blog archive (blog/index.html grid) and article pages under blog/{slug}/index.html
 * Source: content/blog-seo-pack/manifest.json + bodies/*.html
 */
const fs = require('node:fs');
const path = require('node:path');
const { siteChromeIcons, siteChromeNav, siteChromeFooter } = require('../lib/site-chrome');
const { buildBlogPostingGraph } = require('../lib/seo-jsonld');
const { renderRelatedServicesSection } = require('../lib/blog-related-services');
const {
  gtmHead,
  gtmBody,
  trackingStylesLink,
  trackingScriptsAfterAnalytics
} = require('../lib/tracking-snippets');
const { ensureBlogArchiveTracking } = require('../lib/blog-archive-tracking');

const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'content', 'blog-seo-pack', 'manifest.json');
const backupPath = path.join(root, 'content', 'blog-seo-pack', 'seo-pack-10-draft.backup.json');
const sitemapBlogPath = path.join(root, 'sitemap-blog.xml');
const ARCHIVE_PAGE_SIZE = 6;
const bodiesDir = path.join(root, 'content', 'blog-seo-pack', 'bodies');
const blogIndexPath = path.join(root, 'blog', 'index.html');
const SITE = 'https://www.premiumdevelopers.co';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function categoryTags(slugs) {
  if (!slugs?.length) return '';
  const chips = slugs
    .slice(0, 2)
    .map((s) => `<span class="blog-card__cat">${escapeHtml(s.replace(/-/g, ' '))}</span>`)
    .join('');
  return `<div class="blog-card__cats">${chips}</div>`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso)
  );
}

const PUBLISHED_DATES = [
  '2025-09-02T10:00:00.000Z',
  '2025-09-09T10:00:00.000Z',
  '2025-09-16T10:00:00.000Z',
  '2025-09-23T10:00:00.000Z',
  '2025-09-30T10:00:00.000Z',
  '2025-10-07T10:00:00.000Z',
  '2025-10-14T10:00:00.000Z',
  '2025-10-21T10:00:00.000Z',
  '2025-10-28T10:00:00.000Z',
  '2025-11-04T10:00:00.000Z',
  '2026-11-10T10:00:00.000Z',
  '2026-11-17T10:00:00.000Z',
  '2026-11-24T10:00:00.000Z',
  '2026-12-01T10:00:00.000Z',
  '2026-12-08T10:00:00.000Z',
  '2026-12-15T10:00:00.000Z',
  '2026-12-22T10:00:00.000Z',
  '2026-12-29T10:00:00.000Z',
  '2027-01-05T10:00:00.000Z',
  '2027-01-12T10:00:00.000Z',
  '2027-01-19T10:00:00.000Z'
];
const FEATURED_SLUG = 'divi-website-redesign';

function articleUrl(slug) {
  return `/blog/${encodeURIComponent(slug)}/`;
}

const FALLBACK_IMG = `${SITE}/assets/images/og/premium-developers-og.jpg`;

/** Responsive Unsplash URLs; passthrough for other hosts. */
function resolveAssetUrl(url) {
  const u = String(url || '').trim();
  if (!u) return FALLBACK_IMG;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return `${SITE}${u}`;
  return `${SITE}/${u.replace(/^\.\//, '')}`;
}

function buildResponsiveImage(rawUrl, { variant = 'card' } = {}) {
  const fallback = FALLBACK_IMG;
  const url = String(rawUrl || '').trim() || fallback;
  if (url.startsWith('/') || (!url.includes('images.unsplash.com') && !/^https?:\/\//i.test(url))) {
    const src = resolveAssetUrl(url);
    const w = variant === 'hero' ? 1200 : 640;
    const h = variant === 'hero' ? 630 : 400;
    return {
      src,
      srcset: '',
      sizes: variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px',
      width: w,
      height: h
    };
  }
  if (!url.includes('images.unsplash.com')) {
    const w = variant === 'hero' ? 1200 : 640;
    const h = variant === 'hero' ? 630 : 400;
    return {
      src: url,
      srcset: '',
      sizes: variant === 'hero' ? '100vw' : '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px',
      width: w,
      height: h
    };
  }

  const widths = variant === 'hero' ? [480, 768, 1024, 1200] : [320, 480, 640, 800];
  const aspect = variant === 'hero' ? 630 / 1200 : 10 / 16;

  function urlAt(w) {
    const u = new URL(url.split('?')[0]);
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    u.searchParams.set('q', variant === 'hero' ? '82' : '78');
    u.searchParams.set('w', String(w));
    u.searchParams.set('h', String(Math.round(w * aspect)));
    return u.toString();
  }

  const src = urlAt(widths[widths.length - 1]);
  const srcset = widths.map((w) => `${urlAt(w)} ${w}w`).join(', ');
  const sizes =
    variant === 'hero'
      ? '(max-width: 640px) 100vw, (max-width: 960px) 100vw, 720px'
      : '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px';

  return {
    src,
    srcset,
    sizes,
    width: widths[widths.length - 1],
    height: Math.round(widths[widths.length - 1] * aspect)
  };
}

function renderImg(rawUrl, alt, { variant = 'card', loading = 'lazy', priority = false } = {}) {
  const img = buildResponsiveImage(rawUrl, { variant });
  const fetch = priority ? ' fetchpriority="high"' : '';
  const srcsetAttr = img.srcset ? ` srcset="${escapeAttr(img.srcset)}" sizes="${escapeAttr(img.sizes)}"` : '';
  const onerr = `this.onerror=null;this.removeAttribute('srcset');this.removeAttribute('sizes');this.src='${escapeAttr(FALLBACK_IMG)}';`;
  return `<img src="${escapeAttr(img.src)}"${srcsetAttr} alt="${escapeAttr(alt)}" width="${img.width}" height="${img.height}" loading="${loading}" decoding="async" referrerpolicy="no-referrer"${fetch} onerror="${escapeAttr(onerr)}">`;
}

function renderArchiveCard(post) {
  const url = articleUrl(post.slug);
  const alt = post.featuredImage?.alt || post.title;
  const excerpt = post.excerpt || post.metaDescription || '';
  return `<a class="blog-card" href="${escapeAttr(url)}" data-title="${escapeAttr(
    post.title.toLowerCase()
  )}" data-slug="${escapeAttr(post.slug)}">
      <figure class="blog-card__thumb">${renderImg(post.featuredImage?.url, alt, { variant: 'card' })}</figure>
      <div class="blog-card__body">
        ${categoryTags(post.categorySlugs)}
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(excerpt)}</p>
        <div class="blog-meta"><span>Premium Developers</span><span>${escapeHtml(formatDate(post.publishedAt))}</span></div>
      </div>
    </a>`;
}

function renderFeaturedCard(post) {
  const url = articleUrl(post.slug);
  const alt = post.featuredImage?.alt || post.title;
  const excerpt = post.excerpt || post.metaDescription || '';
  return `<a class="blog-featured__card" href="${escapeAttr(url)}">
      <figure class="blog-featured__media">${renderImg(post.featuredImage?.url, alt, { variant: 'hero', loading: 'eager', priority: true })}</figure>
      <div class="blog-featured__body">
        <span class="blog-badge">Featured article</span>
        <h2>${escapeHtml(post.title)}</h2>
        <p>${escapeHtml(excerpt)}</p>
        <div class="blog-meta"><span>Premium Developers</span><span>${escapeHtml(formatDate(post.publishedAt))}</span></div>
      </div>
    </a>`;
}

function headLinks() {
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" href="/assets/icons/icon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <meta name="theme-color" content="#0B2640">
  <link rel="dns-prefetch" href="https://images.unsplash.com">
  <link rel="preconnect" href="https://images.unsplash.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/blog/blog.css">
  <link rel="stylesheet" href="/service-pages.css">
  <link rel="stylesheet" href="/exit-intent.css">
  <link rel="stylesheet" href="/offer-popup.css">
  <link rel="stylesheet" href="/whatsapp-button.css">
${trackingStylesLink()}`;
}

function scriptsBlock() {
  return `  <script src="/script.js" defer></script>
  <script src="/blog/blog-archive-enhance.js" defer></script>
  <script src="/analytics.js"></script>
${trackingScriptsAfterAnalytics()}
  <script src="/whatsapp-config.js"></script>
  <script src="/whatsapp-button.js" defer></script>
  <script src="/exit-intent.js" data-frequency-days="30" defer></script>
  <script src="/offer-popup.js" defer></script>`;
}

function renderArticlePage(post, bodyHtml, related) {
  const canonical = `${SITE}${articleUrl(post.slug)}`;
  const title = `${post.seoTitle || post.title} | Premium Developers Blog`;
  const description = post.metaDescription || post.excerpt || post.title;
  const img = resolveAssetUrl(post.featuredImage?.url || '/assets/images/og/premium-developers-og.jpg');
  const jsonLd = buildBlogPostingGraph(
    {
      title: post.title,
      metaDescription: post.metaDescription,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      imageUrl: img
    },
    canonical
  );
  const relatedArticlesHtml = related.length
    ? `<section class="blog-related" aria-labelledby="blog-related-articles-heading">
      <h2 id="blog-related-articles-heading">Related articles</h2>
      <div class="blog-grid">${related.map(renderArchiveCard).join('')}</div>
    </section>`
    : '';

  const articleEndHtml = `<section class="blog-article-end" aria-label="Next steps">
    <div class="service-wrap">
      <div class="blog-article-cta">
        <p>Need WordPress, Elementor, or WooCommerce help for a project like this?</p>
        <a class="btn btn--primary" href="/contact?reason=Project%20discussion">Discuss a project with us <span aria-hidden="true">→</span></a>
      </div>
      ${renderRelatedServicesSection(post)}
      ${relatedArticlesHtml}
    </div>
  </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
${headLinks()}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeAttr(post.seoTitle || post.title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(img)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeAttr(img)}">
  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
  </script>
</head>
<body class="service-page blog-page" data-blog-archive="static">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: 'blog' })}
<main id="main-content" tabindex="-1">
  <article class="service-wrap blog-article-hero">
    <nav class="service-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Blog</a><span>/</span><span aria-current="page">${escapeHtml(post.title)}</span></nav>
    <span class="service-kicker">Article</span>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="blog-meta"><span>Premium Developers</span><span>Published ${escapeHtml(formatDate(post.publishedAt))}</span></div>
    <figure class="blog-article-featured">${renderImg(post.featuredImage?.url, post.featuredImage?.alt || post.title, { variant: 'hero', loading: 'eager', priority: true })}</figure>
  </article>
  <div class="service-wrap blog-article-layout">
    <div class="blog-article-content">${bodyHtml}</div>
  </div>
  ${articleEndHtml}
</main>
${siteChromeFooter()}
<button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></button>
${scriptsBlock()}
</body>
</html>`;
}

async function verifyImageUrl(url) {
  const u = String(url || '').trim();
  if (!u || u.startsWith('/') || (!/^https?:\/\//i.test(u) && !u.includes('unsplash'))) {
    return true;
  }
  try {
    const res = await fetch(u.split('?')[0] + '?auto=format&fit=crop&w=400&q=80', { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let backupArticles = [];
  if (fs.existsSync(backupPath)) {
    try {
      backupArticles = JSON.parse(fs.readFileSync(backupPath, 'utf8')).articles || [];
    } catch {
      backupArticles = [];
    }
  }
  const bodyBySlug = new Map(backupArticles.map((a) => [a.slug, a.bodyHtml]));

  const posts = manifest
    .sort((a, b) => a.publishPriority - b.publishPriority)
    .map((entry, i) => ({
      ...entry,
      excerpt: entry.metaDescription,
      publishedAt: PUBLISHED_DATES[i] || PUBLISHED_DATES[0],
      bodyHtml:
        bodyBySlug.get(entry.slug) || fs.readFileSync(path.join(bodiesDir, entry.bodyFile), 'utf8')
    }));

  for (const post of posts) {
    const ok = await verifyImageUrl(post.featuredImage?.url || '');
    if (!ok) {
      console.warn(`WARN: featured image not reachable for "${post.slug}" — using site fallback OG image.`);
      post.featuredImage = {
        ...(post.featuredImage || {}),
        url: FALLBACK_IMG
      };
    }
  }

  const featured = posts.find((p) => p.slug === FEATURED_SLUG) || posts[0];
  const rest = posts.filter((p) => p !== featured);
  const featuredHtml = `<div id="blog-featured" class="blog-featured">${renderFeaturedCard(featured)}</div>`;
  const gridHtml = rest.map(renderArchiveCard).join('\n      ');
  const paginationHtml = `<nav class="blog-pagination" id="blog-pagination" aria-label="Blog pages" data-page-size="${ARCHIVE_PAGE_SIZE}"></nav>`;

  let indexHtml = fs.readFileSync(blogIndexPath, 'utf8');
  indexHtml = indexHtml.replace(
    /<body class="service-page blog-page" data-blog-archive="[^"]*">/,
    '<body class="service-page blog-page" data-blog-archive="static">'
  );
  indexHtml = indexHtml.replace(
    /<div id="blog-featured"[\s\S]*?<nav class="blog-pagination" id="blog-pagination"[\s\S]*?<\/nav>/,
    `${featuredHtml}
      <div id="blog-grid" class="blog-grid" aria-live="polite">
      ${gridHtml}
      </div>
      ${paginationHtml}`
  );
  indexHtml = indexHtml.replace(
    /<p id="blog-static-fallback-note"[\s\S]*?<\/p>\s*/i,
    ''
  );
  if (!indexHtml.includes('preconnect" href="https://images.unsplash.com"')) {
    indexHtml = indexHtml.replace(
      '<link rel="preconnect" href="https://fonts.googleapis.com">',
      `<link rel="dns-prefetch" href="https://images.unsplash.com">
  <link rel="preconnect" href="https://images.unsplash.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">`
    );
  }
  indexHtml = indexHtml.replace(
    /<script src="\/blog\/config\.js"><\/script>\s*/i,
    ''
  );
  indexHtml = ensureBlogArchiveTracking(indexHtml);
  fs.writeFileSync(blogIndexPath, indexHtml, 'utf8');
  console.log('Updated', path.relative(root, blogIndexPath));

  const allowedSlugs = new Set(posts.map((p) => p.slug));
  const blogRoot = path.join(root, 'blog');
  for (const name of fs.readdirSync(blogRoot, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    if (['node_modules'].includes(name.name)) continue;
    if (!allowedSlugs.has(name.name)) {
      fs.rmSync(path.join(blogRoot, name.name), { recursive: true, force: true });
      console.log('Removed legacy blog folder', name.name);
    }
  }

  for (const post of posts) {
    const dir = path.join(root, 'blog', post.slug);
    fs.mkdirSync(dir, { recursive: true });
    const related = posts
      .filter((p) => p.slug !== post.slug)
      .sort((a, b) => a.publishPriority - b.publishPriority)
      .slice(0, 3);
    const html = renderArticlePage(post, post.bodyHtml, related);
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    console.log('Wrote', path.relative(root, path.join(dir, 'index.html')));
  }

  require('./build-sitemap');

  console.log(`Static blog: ${posts.length} articles.`);
}

function toSitemapDate(iso) {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
