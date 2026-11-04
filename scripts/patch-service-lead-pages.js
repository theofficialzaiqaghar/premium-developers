#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'services');
const map = {
  'wordpress-development.html': 'WordPress Development',
  'elementor-development.html': 'Elementor Development',
  'woocommerce-development.html': 'WooCommerce Development',
  'website-redesign.html': 'Website Redesign',
  'custom-development.html': 'Custom Development',
  'custom-wordpress-plugin-development.html': 'Custom WordPress Plugin Development',
  'landing-pages.html': 'Landing Pages',
  'speed-performance.html': 'Speed & Performance',
  'maintenance-support.html': 'Maintenance & Support',
  'essential-web.html': 'Essential Web',
  'custom-apps.html': 'Custom Apps',
  'enterprise.html': 'Enterprise'
};

const headAssets = `
  <link rel="stylesheet" href="../contact-page.css">
  <link rel="stylesheet" href="/service-inquiry.css">`;

const footScripts = `
    <script src="/analytics.js"></script>
  <script src="/lead-forms.js" defer></script>
  <script src="/service-page-leads.js" defer></script>`;

for (const [file, serviceName] of Object.entries(map)) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing', file);
    continue;
  }
  let html = fs.readFileSync(filePath, 'utf8');

  if (!html.includes('data-pd-primary-service')) {
    html = html.replace(
      '<body class="service-page">',
      `<body class="service-page" data-pd-primary-service="${serviceName}">`
    );
  }

  if (!html.includes('service-inquiry.css')) {
    html = html.replace('</head>', `${headAssets}\n</head>`);
  }

  html = html.replaceAll('href="/contact?reason=Project%20discussion"', 'href="#project-inquiry" class="pd-lead-cta"');
  html = html.replace(
    /href="#project-inquiry"( class="pd-lead-cta")?( class="pd-lead-cta")?/g,
    'href="#project-inquiry" class="pd-lead-cta"'
  );

  // Fix double class attributes on buttons that already had class=
  html = html.replace(/class="([^"]*btn[^"]*)" class="pd-lead-cta"/g, 'class="$1 pd-lead-cta"');
  html = html.replace(/class="pd-lead-cta" class="([^"]+)"/g, 'class="pd-lead-cta $1"');

  if (!html.includes('lead-forms.js')) {
    html = html.replace('<script src="../script.js" defer></script>', `<script src="../script.js" defer></script>${footScripts}`);
  }

  if (!html.includes('id="project-inquiry"')) {
    const block = `
    <section class="service-wrap service-inquiry" id="project-inquiry" aria-labelledby="project-inquiry-title" data-pd-service="${serviceName}">
      <div class="service-inquiry__grid">
        <div class="service-inquiry__copy">
          <span class="service-kicker">GET A FREE QUOTE</span>
          <h2 id="project-inquiry-title">Request a project estimate</h2>
          <p>Tell us about your goals, timeline, and website. We aim to reply within two business days.</p>
          <ul class="service-inquiry__points">
            <li>Free, no-obligation review</li>
            <li>Clear scope and pricing conversation</li>
            <li>Secure — same system as our contact page</li>
          </ul>
        </div>
        <div class="service-inquiry__form contact-form-card" data-pd-lead-form-mount data-pd-service="${serviceName}"></div>
      </div>
    </section>`;
    html = html.replace(
      /<section class="service-wrap"><div class="service-cta">/,
      `${block}\n    <section class="service-wrap"><div class="service-cta">`
    );
  }

  // Mid-page inline CTA once
  if (!html.includes('service-inline-cta')) {
    html = html.replace(
      /<div class="service-section-head">(<span class="service-kicker">[^<]+<\/span><h2>[^<]+<\/h2><p>[^<]+<\/p>)<\/div>/,
      `<div class="service-section-head">$1<p class="service-inline-cta"><a class="pd-lead-cta" href="#project-inquiry" data-cta-location="mid_page">Get a free quote</a> · <a class="pd-lead-cta" href="#project-inquiry" data-cta-location="mid_page">Request pricing</a></p></div>`
    );
  }

  // Bottom CTA: add quote button alongside Upwork where primary is Upwork
  html = html.replace(
    /<div class="service-cta"><div><h2>([^<]+)<\/h2><p>([^<]+)<\/p><\/div><a class="btn btn--primary" href="https:\/\/www\.upwork\.com[^"]+"[^>]*>([^<]+)<\/a><\/div>/g,
    `<div class="service-cta"><div><h2>$1</h2><p>$2</p></div><div class="service-cta__actions"><a class="btn btn--primary pd-lead-cta" href="#project-inquiry" data-cta-location="footer">Get a free quote</a><a class="btn btn--ghost" href="https://www.upwork.com/freelancers/~0181e957ec9a52d41b?mp_source=share" target="_blank" rel="noopener noreferrer">$3</a></div></div>`
  );

  html = html.replace(
    /<div class="service-cta"><div><h2>([^<]+)<\/h2><p>([^<]+)<\/p><\/div><a class="btn btn--primary pd-lead-cta" href="#project-inquiry"[^>]*>([^<]+)<\/a><\/div>/g,
    `<div class="service-cta"><div><h2>$1</h2><p>$2</p></div><div class="service-cta__actions"><a class="btn btn--primary pd-lead-cta" href="#project-inquiry" data-cta-location="footer">$3</a><a class="btn btn--ghost pd-lead-cta" href="#project-inquiry" data-cta-location="footer">Discuss your project</a></div></div>`
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('patched', file);
}
