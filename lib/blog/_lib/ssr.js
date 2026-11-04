const { toPublicArticle } = require('./public');
const { siteChromeIcons, siteChromeNav, siteChromeFooter } = require('../../site-chrome');

const SITE_ORIGIN = 'https://www.premiumdevelopers.co';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/assets/images/og/premium-developers-og.jpg`;
const GTM_ID = 'GTM-WF285DKZ';

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

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function readingTimeMinutes(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

function canonicalArticleUrl(slug) {
  return `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}/`;
}

function resolveFeaturedImageSrc(article) {
  const url = String(article?.featuredImage?.url || '').trim();
  if (!url) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${SITE_ORIGIN}${url}`;
  return `${SITE_ORIGIN}/${url.replace(/^\.\//, '')}`;
}

function resolveOgImage(article) {
  return resolveFeaturedImageSrc(article);
}

function featuredAlt(article) {
  const alt = article?.featuredImage?.alt;
  if (alt) return alt;
  return article?.title ? `${article.title} — Premium Developers` : 'Premium Developers blog article';
}

function enrichHeadings(html) {
  let index = 0;
  const headings = [];
  const enriched = String(html || '').replace(/<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, inner) => {
    const attrStr = attrs || '';
    if (/\bid\s*=/.test(attrStr)) {
      const idMatch = attrStr.match(/\bid\s*=\s*["']([^"']+)["']/i);
      if (idMatch) headings.push({ tag, id: idMatch[1], text: inner.replace(/<[^>]+>/g, '') });
      return match;
    }
    index += 1;
    const id = `section-${index}`;
    headings.push({ tag, id, text: inner.replace(/<[^>]+>/g, '') });
    return `<${tag}${attrStr} id="${escapeAttr(id)}">${inner}</${tag}>`;
  });
  return { html: enriched, headings };
}

function renderToc(headings) {
  if (!headings.length) {
    return '<aside class="blog-toc" id="blog-toc" hidden aria-label="Table of contents"></aside>';
  }
  const items = headings
    .map((h) => {
      const indent = h.tag.toLowerCase() === 'h3' ? ' style="margin-left:12px"' : '';
      return `<li${indent}><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>`;
    })
    .join('');
  return `<aside class="blog-toc" id="blog-toc" aria-label="Table of contents"><h2>On this page</h2><ol>${items}</ol></aside>`;
}

function gtmHead() {
  return `<!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');</script>
  <!-- End Google Tag Manager -->`;
}

function gtmBody() {
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

function baseHead({ title, description, canonical, ogType, ogImage, robots, ogTitle }) {
  const socialTitle = ogTitle || title;
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="robots" content="${escapeAttr(robots || 'index, follow, max-image-preview:large')}">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:type" content="${escapeAttr(ogType)}">
  <meta property="og:site_name" content="Premium Developers">
  <meta property="og:title" content="${escapeAttr(socialTitle)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:image" content="${escapeAttr(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeAttr(socialTitle)}">
  <meta name="twitter:description" content="${escapeAttr(description)}">
  <meta name="twitter:image" content="${escapeAttr(ogImage)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="icon" type="image/png" href="/assets/icons/icon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
  <meta name="theme-color" content="#0B2640">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/service-pages.css">
  <link rel="stylesheet" href="/services-overview.css">
  <link rel="stylesheet" href="/blog/blog.css">
  <link rel="stylesheet" href="/exit-intent.css">
  <link rel="stylesheet" href="/offer-popup.css">
  <link rel="stylesheet" href="/whatsapp-button.css">`;
}

function whatsappWidgetScripts() {
  return `  <script src="/whatsapp-config.js"></script>
  <script src="/whatsapp-button.js" defer></script>`;
}

function articleJsonLd(article, canonical) {
  const image = resolveOgImage(article);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: article.seoTitle || article.title,
        description: article.metaDescription || article.excerpt,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` }
      },
      {
        '@type': 'Article',
        '@id': `${canonical}#article`,
        headline: article.title,
        description: article.metaDescription || article.excerpt,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt || article.publishedAt,
        author: { '@type': 'Organization', name: article.author || 'Premium Developers' },
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        mainEntityOfPage: { '@id': `${canonical}#webpage` },
        image: [image],
        inLanguage: 'en'
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog/` },
          { '@type': 'ListItem', position: 3, name: article.title, item: canonical }
        ]
      }
    ]
  };
  return JSON.stringify(graph, null, 2);
}

function archiveJsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_ORIGIN}/blog/#webpage`,
        url: `${SITE_ORIGIN}/blog/`,
        name: 'Blog | Premium Developers',
        description:
          'Insights and ideas for better digital growth—WordPress, web development, WooCommerce, Elementor, and related topics.',
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE_ORIGIN}/#website` }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog/` }
        ]
      }
    ]
  };
  return JSON.stringify(graph, null, 2);
}

function renderCategoryTags(slugs) {
  if (!slugs?.length) return '';
  return `<div class="blog-card__cats">${slugs
    .slice(0, 2)
    .map((s) => `<span class="blog-card__cat">${escapeHtml(s.replace(/-/g, ' '))}</span>`)
    .join('')}</div>`;
}

function renderArchiveCard(article) {
  const url = canonicalArticleUrl(article.slug);
  const imgSrc = resolveFeaturedImageSrc(article);
  const img = `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(featuredAlt(article))}" loading="lazy" decoding="async">`;
  const excerpt = escapeHtml(article.excerpt || '');
  const mins = readingTimeMinutes(article.bodyHtml);
  const date = formatDate(article.publishedAt);
  const author = escapeHtml(article.author || 'Premium Developers');
  return `<a class="blog-card" href="${escapeAttr(url)}" data-title="${escapeAttr(
    (article.title || '').toLowerCase()
  )}" data-slug="${escapeAttr(article.slug)}">
      <figure class="blog-card__thumb">${img}</figure>
      <div class="blog-card__body">
        ${renderCategoryTags(article.categorySlugs)}
        <h3>${escapeHtml(article.title)}</h3>
        <p>${excerpt}</p>
        <div class="blog-meta"><span>${author}</span><span>${escapeHtml(date)}</span><span>${mins} min read</span></div>
      </div>
    </a>`;
}

function renderFeaturedCard(article) {
  const url = canonicalArticleUrl(article.slug);
  const imgUrl = resolveOgImage(article);
  const img = `<img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(featuredAlt(article))}" loading="eager" fetchpriority="high" decoding="async">`;
  const excerpt = escapeHtml(article.excerpt || '');
  const mins = readingTimeMinutes(article.bodyHtml);
  const date = formatDate(article.publishedAt);
  const author = escapeHtml(article.author || 'Premium Developers');
  return `<a class="blog-featured__card" href="${escapeAttr(url)}">
      <figure class="blog-featured__media">${img}</figure>
      <div class="blog-featured__body">
        <span class="blog-badge">Featured article</span>
        <h2>${escapeHtml(article.title)}</h2>
        <p>${excerpt}</p>
        <div class="blog-meta"><span>${author}</span><span>${escapeHtml(date)}</span><span>${mins} min read</span></div>
      </div>
    </a>`;
}

function renderArchivePage(articles) {
  const title = 'Blog | Insights & Ideas | Premium Developers';
  const description =
    'Insights and ideas on WordPress, WooCommerce, Elementor, web development, and digital growth from Premium Developers.';
  const canonical = `${SITE_ORIGIN}/blog/`;
  const featured = articles[0];
  const rest = articles.slice(1);
  const featuredHtml = featured
    ? `<div id="blog-featured" class="blog-featured">${renderFeaturedCard(featured)}</div>`
    : '<div id="blog-featured" class="blog-featured" hidden></div>';
  const gridHtml = rest.length
    ? rest.map(renderArchiveCard).join('')
    : featured
      ? ''
      : `<div class="blog-empty"><h2>No published articles yet</h2><p>Check back soon for WordPress, WooCommerce, Elementor, and web development insights from Premium Developers.</p></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
${baseHead({
  title,
  description,
  canonical,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE
})}
  <script type="application/ld+json">
${archiveJsonLd()}
  </script>
</head>
<body class="service-page blog-page" data-blog-archive="server">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: 'blog' })}
  <main id="main-content" tabindex="-1">
    <section class="service-wrap blog-hero">
      <nav class="service-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span aria-current="page">Blog</span></nav>
      <span class="service-kicker">Premium Developers blog</span>
      <h1>Insights &amp; Ideas for Better Digital Growth</h1>
      <p>Practical perspectives on WordPress, WooCommerce, Elementor, website design, and growing your business online—published by Premium Developers.</p>
      <div class="blog-toolbar">
        <label class="blog-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
          <input type="search" id="blog-search" placeholder="Search articles" autocomplete="off" aria-label="Search blog articles">
        </label>
      </div>
    </section>
    <section class="service-wrap">
      ${featuredHtml}
      <div id="blog-grid" class="blog-grid" aria-live="polite" data-ssr-archive="true">${gridHtml}</div>
    </section>
  </main>
${siteChromeFooter()}
  <button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></button>
  <script src="/script.js" defer></script>
  <script src="/blog/config.js"></script>
  <script src="/blog/blog-archive-enhance.js" defer></script>
  <script src="/analytics.js"></script>
${whatsappWidgetScripts()}
  <script src="/exit-intent.js" data-frequency-days="30" defer></script>
  <script src="/offer-popup.js" defer></script>
</body>
</html>`;
}

function renderRelatedCards(related) {
  if (!related?.length) return '';
  const cards = related
    .map((article) => {
      const url = canonicalArticleUrl(article.slug);
      const imgSrc = resolveFeaturedImageSrc(article);
      const img = `<img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(featuredAlt(article))}" loading="lazy" decoding="async">`;
      const mins = readingTimeMinutes(article.bodyHtml);
      const date = formatDate(article.publishedAt);
      return `<a class="blog-card" href="${escapeAttr(url)}">
        <figure class="blog-card__thumb">${img}</figure>
        <div class="blog-card__body"><h3>${escapeHtml(article.title)}</h3><div class="blog-meta"><span>${escapeHtml(
          date
        )}</span><span>${mins} min read</span></div></div>
      </a>`;
    })
    .join('');
  return `<section class="blog-related service-wrap">
      <h2>Related articles</h2>
      <div class="blog-grid">${cards}</div>
    </section>`;
}

function renderArticlePage(article, related = []) {
  const canonical = canonicalArticleUrl(article.slug);
  const seoTitle = article.seoTitle || article.title;
  const pageTitle = `${seoTitle} | Premium Developers Blog`;
  const description = article.metaDescription || article.excerpt || article.title;
  const ogImage = resolveOgImage(article);
  const { html: bodyHtml, headings } = enrichHeadings(article.bodyHtml);
  const toc = renderToc(headings);
  const mins = readingTimeMinutes(article.bodyHtml);
  const published = formatDate(article.publishedAt);
  const updated = formatDate(article.updatedAt);
  const author = escapeHtml(article.author || 'Premium Developers');
  const imgUrl = article.featuredImage?.url;
  const imgSrc =
    imgUrl && imgUrl.startsWith('http')
      ? imgUrl
      : imgUrl && imgUrl.startsWith('/')
        ? `${SITE_ORIGIN}${imgUrl}`
        : '';
  const featured = imgSrc
    ? `<figure class="blog-article-featured"><img src="${escapeAttr(imgSrc)}" alt="${escapeAttr(
        featuredAlt(article)
      )}" width="1200" height="630" loading="eager" fetchpriority="high" decoding="async"></figure>`
    : '';

  const updatedLine =
    article.updatedAt && article.updatedAt !== article.publishedAt
      ? `<span>Updated ${escapeHtml(updated)}</span>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
${baseHead({
  title: pageTitle,
  ogTitle: seoTitle,
  description,
  canonical,
  ogType: 'article',
  ogImage
})}
  <meta property="article:published_time" content="${escapeAttr(article.publishedAt || '')}">
  <meta property="article:modified_time" content="${escapeAttr(article.updatedAt || article.publishedAt || '')}">
  <script type="application/ld+json">
${articleJsonLd(article, canonical)}
  </script>
</head>
<body class="service-page blog-page">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: 'blog' })}
  <main id="main-content" tabindex="-1">
    <article class="service-wrap blog-article-hero">
      <nav class="service-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Blog</a><span>/</span><span aria-current="page">${escapeHtml(article.title)}</span></nav>
      <span class="service-kicker">Article</span>
      <h1 id="blog-article-title">${escapeHtml(article.title)}</h1>
      <div class="blog-meta" id="blog-article-meta"><span>${author}</span><span>Published ${escapeHtml(
        published
      )}</span>${updatedLine}<span>${mins} min read</span></div>
      ${featured}
    </article>
    <div class="service-wrap blog-article-layout">
      <div class="blog-article-content" id="blog-article-content">${bodyHtml}</div>
      ${toc}
    </div>
    <div class="service-wrap">
      <p style="margin-top:28px"><a class="btn btn--primary" href="/contact?reason=Project%20discussion">Discuss a project with us <span aria-hidden="true">→</span></a></p>
    </div>
    ${renderRelatedCards(related)}
  </main>
${siteChromeFooter()}
  <button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></button>
  <script src="/script.js" defer></script>
  <script src="/analytics.js"></script>
${whatsappWidgetScripts()}
</body>
</html>`;
}

function renderNotFoundPage(kind = 'article') {
  const title = kind === 'article' ? 'Article not found | Premium Developers Blog' : 'Not found';
  const canonical = `${SITE_ORIGIN}/blog/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
${baseHead({
  title,
  description: 'The requested blog article could not be found.',
  canonical,
  ogType: 'website',
  ogImage: DEFAULT_OG_IMAGE,
  robots: 'noindex, follow'
})}
</head>
<body class="service-page blog-page">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: 'blog' })}
  <main id="main-content" tabindex="-1">
    <div class="service-wrap blog-error">
      <h1>Article not found</h1>
      <p>This article is not published or does not exist.</p>
      <p><a class="btn btn--ghost" href="/blog/">Back to blog</a></p>
    </div>
  </main>
${siteChromeFooter()}
  <button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><svg class="ico" aria-hidden="true"><use href="#i-arrow" /></svg></button>
  <script src="/script.js" defer></script>
  <script src="/analytics.js"></script>
${whatsappWidgetScripts()}
</body>
</html>`;
}

function pickRelated(current, all, limit = 3) {
  const others = all.filter((a) => a.slug !== current.slug);
  const currentCats = new Set(current.categorySlugs || []);
  const scored = others.map((a) => {
    const overlap = (a.categorySlugs || []).filter((c) => currentCats.has(c)).length;
    return { a, score: overlap };
  });
  scored.sort((x, y) => y.score - x.score || Date.parse(y.a.publishedAt) - Date.parse(x.a.publishedAt));
  return scored.slice(0, limit).map((s) => s.a);
}

module.exports = {
  SITE_ORIGIN,
  escapeHtml,
  formatDate,
  readingTimeMinutes,
  canonicalArticleUrl,
  renderArchivePage,
  renderArticlePage,
  renderNotFoundPage,
  pickRelated
};
