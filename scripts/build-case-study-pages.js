#!/usr/bin/env node
/**
 * Generates full case study HTML under case-studies/ (Option 1 URLs via vercel rewrites).
 * Run: node scripts/build-case-study-pages.js
 */
const fs = require('node:fs');
const path = require('node:path');
const { CASE_STUDIES } = require('../lib/case-study-page-data');
const { gtmHead, gtmBody, trackingStylesLink, trackingScriptsAfterAnalytics } = require('../lib/tracking-snippets');
const { siteChromeIcons, siteChromeNav, siteChromeFooter } = require('../lib/site-chrome');

const SITE = 'https://www.premiumdevelopers.co';
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'case-studies');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(cs) {
  const pageUrl = `${SITE}/case-studies/${cs.slug}/`;
  const ogImage = `${SITE}${cs.image}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: cs.title,
        description: cs.metaDescription,
        inLanguage: 'en',
        about: { '@id': `${pageUrl}#project` },
        isPartOf: { '@id': `${SITE}/#website` }
      },
      {
        '@type': 'CreativeWork',
        '@id': `${pageUrl}#project`,
        name: cs.name,
        description: cs.overview,
        url: cs.liveUrl,
        image: ogImage,
        creator: { '@id': `${SITE}/#organization` },
        keywords: cs.keywords
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Case Studies', item: `${SITE}/case-studies/` },
          { '@type': 'ListItem', position: 3, name: cs.name, item: pageUrl }
        ]
      }
    ]
  };
}

function render(cs) {
  const pageUrl = `${SITE}/case-studies/${cs.slug}/`;
  const ogImage = `${SITE}${cs.image}`;
  const techList = cs.tech.map((t) => `            <li>${esc(t)}</li>`).join('\n');
  const serviceLinks = cs.services
    .map((s) => `            <li><a href="${s.href}">${esc(s.label)}</a></li>`)
    .join('\n');
  const liveHost = cs.liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="${pageUrl}">
<title>${esc(cs.title)}</title>
<meta name="description" content="${esc(cs.metaDescription)}">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Premium Developers">
<meta property="og:title" content="${esc(cs.title)}">
<meta property="og:description" content="${esc(cs.metaDescription)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="${esc(cs.imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cs.name)} Case Study | Premium Developers">
<meta name="twitter:description" content="${esc(cs.metaDescription)}">
<meta name="twitter:image" content="${ogImage}">
<script type="application/ld+json">
${JSON.stringify(jsonLd(cs), null, 2)}
</script>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" href="/assets/icons/icon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<meta name="theme-color" content="#0B2640">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/service-pages.css">
<link rel="stylesheet" href="/case-study-pages.css">
<link rel="stylesheet" href="/exit-intent.css">
<link rel="stylesheet" href="/offer-popup.css">
<link rel="stylesheet" href="/whatsapp-button.css">
<link rel="stylesheet" href="/service-conversion.css">
${trackingStylesLink()}
</head>
<body class="service-page case-study-page">
${gtmBody()}
<a class="skip-link" href="#main-content">Skip to main content</a>
${siteChromeIcons()}
${siteChromeNav({ active: 'portfolio' })}

<main id="main-content" tabindex="-1">
    <section class="service-wrap case-study-hero">
      <div class="case-study-hero__copy">
        <nav class="service-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/case-studies/">Case studies</a><span>/</span><span aria-current="page">${esc(cs.name)}</span></nav>
        <span class="service-kicker">Case study</span>
        <h1>${esc(cs.name)}</h1>
        <p class="service-hero__intro">${esc(cs.heroIntro)}</p>
        <ul class="case-study-meta">
          <li>Client: ${esc(cs.name)}</li>
          <li>Industry: ${esc(cs.industry)}</li>
          <li>Platform: WordPress · Divi · Elementor</li>
          <li>Live site: <a href="${esc(cs.liveUrl)}" target="_blank" rel="noopener noreferrer">${esc(liveHost)}</a></li>
        </ul>
        <div class="case-study-hero__actions">
          <a class="btn btn--primary" href="${esc(cs.liveUrl)}" target="_blank" rel="noopener noreferrer">View live website <span aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="/contact?reason=${cs.contactReason}">Discuss a similar project</a>
        </div>
      </div>
      <figure class="case-study-hero__media"><img src="${cs.image}" alt="${esc(cs.imageAlt)}" width="1200" height="800" loading="eager" fetchpriority="high" decoding="async"></figure>
    </section>

    <div class="case-study-layout service-wrap">
      <article class="case-study-article">
        <section class="case-study-section" id="overview">
          <h2>Project overview</h2>
          <p>${esc(cs.overview)}</p>
        </section>
        <section class="case-study-section" id="challenge">
          <h2>Client challenge</h2>
          <p>${esc(cs.challenge)}</p>
          <p class="case-study-note">We do not publish traffic, conversion, or revenue claims for this project without measured evidence and client approval.</p>
        </section>
        <section class="case-study-section" id="solution">
          <h2>Our solution</h2>
          <p>${esc(cs.solution)}</p>
        </section>
        <section class="case-study-section" id="technologies">
          <h2>Technologies used</h2>
          <ul>
${techList}
          </ul>
        </section>
        <section class="case-study-section" id="gallery">
          <h2>Screenshots of completed work</h2>
          <p>Portfolio capture from the Premium Developers project files:</p>
          <div class="case-study-gallery">
            <figure><img src="${cs.image}" alt="${esc(cs.imageAlt)} — portfolio screenshot" width="1200" height="800" loading="lazy" decoding="async"></figure>
          </div>
        </section>
        <section class="case-study-section" id="live-site">
          <h2>Live project</h2>
          <p>The published website is available at <a href="${esc(cs.liveUrl)}" target="_blank" rel="noopener noreferrer">${esc(liveHost)}</a>. Explore the live site to see layout, service sections, and enquiry paths as implemented on WordPress.</p>
        </section>
        <section class="case-study-section" id="related-services">
          <h2>Relevant services</h2>
          <p>If you are planning a similar build, these service pages describe how we work:</p>
          <ul>
${cs.services.map((s) => `            <li><a href="${s.href}">${esc(s.label)}</a></li>`).join('\n')}
          </ul>
        </section>
      </article>

      <aside class="case-study-sidebar" aria-label="Project details">
        <div class="case-study-sidebar__card">
          <h2>Project details</h2>
          <dl>
            <div><dt>Client</dt><dd>${esc(cs.name)}</dd></div>
            <div><dt>Website</dt><dd><a href="${esc(cs.liveUrl)}" target="_blank" rel="noopener noreferrer">${esc(liveHost)}</a></dd></div>
            <div><dt>Platform</dt><dd>WordPress</dd></div>
            <div><dt>Builders</dt><dd>Divi · Elementor</dd></div>
            <div><dt>Our role</dt><dd>Website design &amp; development</dd></div>
          </dl>
        </div>
        <div class="case-study-sidebar__card">
          <h2>Related services</h2>
          <ul class="case-study-sidebar__links">
${serviceLinks}
          </ul>
        </div>
      </aside>
    </div>

    <section class="service-wrap case-study-similar-cta" id="case-study-similar-cta" hidden aria-labelledby="case-study-similar-title">
      <div class="service-cta">
        <div>
          <h2 id="case-study-similar-title">Want a website with similar quality?</h2>
          <p>${esc(cs.ctaBody)}</p>
        </div>
        <a class="btn btn--primary" href="/contact?reason=${cs.contactReason}">Discuss a Similar Project <span aria-hidden="true">→</span></a>
      </div>
    </section>
  </main>
  <button class="back-to-top" type="button" aria-label="Back to top" title="Back to top" hidden><span aria-hidden="true">↑</span></button>
${siteChromeFooter()}
<script src="/script.js" defer></script>
<script src="/analytics.js"></script>
${trackingScriptsAfterAnalytics()}
<script src="/whatsapp-config.js"></script>
<script src="/service-conversion.js" defer></script>
<script src="/whatsapp-button.js" defer></script>
<script src="/exit-intent.js" data-frequency-days="30" defer></script>
<script src="/offer-popup.js" defer></script>
</body>
</html>
`;
}

function main() {
  for (const cs of CASE_STUDIES) {
    const file = path.join(outDir, `${cs.slug}.html`);
    fs.writeFileSync(file, render(cs), 'utf8');
    console.log(`Wrote ${path.relative(root, file)}`);
  }
}

main();
