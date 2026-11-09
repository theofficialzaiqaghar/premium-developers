/**
 * Pick service pages to surface at the bottom of blog articles (internal linking).
 */

const SERVICE_PAGES = [
  {
    href: '/services/woocommerce-development.html',
    title: 'Hire a WooCommerce Developer',
    description: 'WooCommerce store setup, checkout, payments, and catalogue work for UK and US businesses.',
    match: new Set(['woocommerce', 'ecommerce', 'uk'])
  },
  {
    href: '/services/wordpress-development.html',
    title: 'WordPress Development',
    description: 'Business websites, CMS structure, and builds you can maintain after launch.',
    match: new Set(['wordpress', 'guides', 'web-design', 'performance', 'uk', 'pricing'])
  },
  {
    href: '/services/elementor-development.html',
    title: 'Elementor Development',
    description: 'Flexible layouts, landing sections, and marketing pages built in Elementor.',
    match: new Set(['elementor', 'web-design'])
  },
  {
    href: '/services/website-redesign.html',
    title: 'Website Redesign',
    description: 'Modernise structure, branding, and UX without losing SEO equity.',
    match: new Set(['web-design', 'guides'])
  },
  {
    href: '/services/speed-performance.html',
    title: 'Speed & Performance',
    description: 'Core Web Vitals, caching, image optimisation, and faster WordPress loads.',
    match: new Set(['performance'])
  },
  {
    href: '/services/landing-pages.html',
    title: 'Landing Pages',
    description: 'Focused campaign pages with clear CTAs and conversion-oriented layout.',
    match: new Set(['web-design'])
  }
];

const DEFAULT_SLUGS = ['woocommerce', 'wordpress', 'elementor'];

function postMatchKeys(post) {
  const keys = new Set();
  for (const s of post.categorySlugs || []) keys.add(String(s).toLowerCase());
  for (const s of post.tagSlugs || []) keys.add(String(s).toLowerCase());
  return keys;
}

function scoreService(service, keys) {
  let score = 0;
  for (const k of keys) {
    if (service.match.has(k)) score += 1;
  }
  return score;
}

function pickRelatedServices(post, limit = 3) {
  const keys = postMatchKeys(post);
  const ranked = SERVICE_PAGES.map((service) => ({
    service,
    score: scoreService(service, keys)
  }))
    .sort((a, b) => b.score - a.score || a.service.title.localeCompare(b.service.title));

  const chosen = [];
  for (const row of ranked) {
    if (row.score > 0 && chosen.length < limit) {
      chosen.push(row.service);
    }
  }

  if (chosen.length < limit) {
    for (const service of SERVICE_PAGES) {
      if (chosen.length >= limit) break;
      if (!chosen.includes(service)) chosen.push(service);
    }
  }

  return chosen.slice(0, limit);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderRelatedServicesSection(post) {
  const services = pickRelatedServices(post, 3);
  const cards = services
    .map(
      (s) => `<a class="blog-related-service" href="${s.href}">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.description)}</p>
        <span class="blog-related-service__link">View service <span aria-hidden="true">→</span></span>
      </a>`
    )
    .join('');

  return `<section class="blog-related-services" aria-labelledby="blog-related-services-heading">
      <h2 id="blog-related-services-heading">Related services</h2>
      <div class="blog-related-services__grid">${cards}</div>
    </section>`;
}

module.exports = {
  pickRelatedServices,
  renderRelatedServicesSection
};
