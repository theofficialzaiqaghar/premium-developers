/**
 * Shared site header (nav) and footer — matches index.html chrome.
 * All links use root-absolute paths for consistency across page depths.
 */
const { siteChromeSocialLinksHtml } = require('./social-profiles');

function navLinkClass(active, key) {
  return active === key ? ' class="is-active"' : '';
}

function siteChromeIcons() {
  return `  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <symbol id="i-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </symbol>
      <symbol id="i-layout" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M9 9v11" />
        </g>
      </symbol>
      <symbol id="i-globe" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
        </g>
      </symbol>
      <symbol id="i-share" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.7 10.5l6.6-4M8.7 13.5l6.6 4" />
        </g>
      </symbol>
      <symbol id="i-mail" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </g>
      </symbol>
      <symbol id="i-linkedin" viewBox="0 0 24 24">
        <g fill="currentColor">
          <path d="M6.94 8.5a1.94 1.94 0 1 1 0-3.88 1.94 1.94 0 0 1 0 3.88zM5.25 10.13h3.38v9.37H5.25V10.13zM13.03 10.13h3.24v1.28h.05c.45-.85 1.55-1.75 3.19-1.75 3.41 0 4.04 2.12 4.04 4.88v5.96h-3.38v-5.28c0-1.26-.02-2.88-1.76-2.88-1.76 0-2.03 1.37-2.03 2.79v5.37h-3.35V10.13z" />
        </g>
      </symbol>
      <symbol id="i-facebook" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 8.5h2.5V5h-2.5c-2.48 0-4 1.52-4 4.16V12H8v3.5h1.5V22h3.5v-6.5H16l.5-3.5h-3V9.5c0-1.03.35-1.5 1.5-1.5z" />
      </symbol>
      <symbol id="i-instagram" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </g>
      </symbol>
      <symbol id="i-user" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 12 0v1" />
        </g>
      </symbol>
    </defs>
  </svg>`;
}

function siteChromeNav({ active = null, isHome = false } = {}) {
  const homeHref = isHome ? '#home' : '/';
  const portfolioHref = isHome ? '#work' : '/#work';
  const processHref = isHome ? '#process' : '/#process';
  const consultHref = '/contact';

  return `  <header class="nav" id="nav">
    <div class="nav__inner">
      <a href="${homeHref}" class="logo" aria-label="Premium Developers home">
        <img class="logo__mark" src="/logo.svg" alt="Premium Developers logo" width="64" height="64">
        <span class="logo__text">Premium Developers</span>
      </a>
      <nav class="nav__links" id="nav-links" aria-label="Primary">
        <a href="${homeHref}"${navLinkClass(active, 'home')}>Home</a>
        <a href="/about"${navLinkClass(active, 'about')}>About</a>
        <div class="nav__dropdown">
          <button class="nav__dropdown-toggle" id="services-menu-toggle" type="button" aria-expanded="false" aria-controls="services-menu">
            Services
            <svg class="nav__dropdown-chevron" aria-hidden="true" viewBox="0 0 20 20">
              <path d="m5 7.5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="nav__dropdown-menu" id="services-menu" aria-labelledby="services-menu-toggle" hidden>
            <a class="nav__dropdown-overview" href="/services.html">All services <span aria-hidden="true">→</span></a>
            <a href="/services/woocommerce-development.html">WooCommerce Development</a>
            <a href="/services/wordpress-development.html">WordPress Development</a>
            <a href="/services/elementor-development.html">Elementor Development</a>
            <a href="/divi-development/">Divi Development</a>
            <a href="/services/website-redesign.html">Website Redesign</a>
            <a href="/services/custom-development.html">Custom Development</a>
            <a href="/services/custom-wordpress-plugin-development.html">Custom Plugin Development</a>
            <a href="/services/landing-pages.html">Landing Pages</a>
            <a href="/services/speed-performance.html">Speed &amp; Performance</a>
            <a href="/services/maintenance-support.html">Maintenance &amp; Support</a>
            <a href="/services/essential-web.html">Essential Web</a>
            <a href="/services/custom-apps.html">Custom Apps</a>
            <a href="/services/enterprise.html">Enterprise</a>
          </div>
        </div>
        <a href="${portfolioHref}"${navLinkClass(active, 'portfolio')}>Portfolio</a>
        <a href="${processHref}"${navLinkClass(active, 'process')}>Process</a>
        <a href="/blog/"${navLinkClass(active, 'blog')}>Blog</a>
        <a href="/contact"${navLinkClass(active, 'contact')}>Contact</a>
        <a href="${consultHref}" class="nav__mobile-cta">Book a Consultation</a>
      </nav>
      <a href="${consultHref}" class="btn btn--primary btn--sm">
        Book a Consultation
        <svg class="ico"><use href="#i-arrow" /></svg>
      </a>
      <button class="nav__toggle" type="button" aria-label="Open navigation menu" aria-controls="nav-links" aria-expanded="false">
        <span></span>
        <span></span>
      </button>
    </div>
  </header>`;
}

function siteChromeFooter({ isHome = false } = {}) {
  const homeHref = isHome ? '#home' : '/';
  const portfolioHref = isHome ? '#work' : '/#work';
  const processHref = isHome ? '#process' : '/#process';

  return `  <footer class="footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <a class="logo" href="${homeHref}">
          <img class="logo__mark" src="/logo.svg" alt="Premium Developers logo" width="64" height="64">
          <span>Premium Developers</span>
        </a>
        <p>Professional WordPress development, Elementor design, WooCommerce solutions, custom development, and website support for modern businesses.</p>
        <div class="socials">
${siteChromeSocialLinksHtml({ isHome })}
        </div>
      </div>
      <div class="fcol">
        <h4>SERVICES</h4>
        <a href="/services/wordpress-development.html">WordPress Development</a>
        <a href="/services/elementor-development.html">Elementor Development</a>
        <a href="/services/woocommerce-development.html">WooCommerce</a>
        <a href="/services/website-redesign.html">Website Redesign</a>
        <a href="/services/speed-performance.html">Speed &amp; Performance</a>
        <a href="/services/maintenance-support.html">Maintenance &amp; Support</a>
      </div>
      <div class="fcol">
        <h4>COMPANY</h4>
        <a href="/about">About</a>
        <a href="${portfolioHref}">Portfolio</a>
        <a href="${processHref}">Process</a>
        <a href="/services.html">Services</a>
        <a href="/blog/">Blog</a>
        <a href="/contact">Contact</a>
      </div>
      <div class="fcol fcol--news">
        <h4>GET IN TOUCH</h4>
        <p>Have a project in mind? Send us the details and we'll get back to you.</p>
        <a href="mailto:hello@premiumdevelopers.co" class="mail">
          <svg class="ico"><use href="#i-mail" /></svg>
          hello@premiumdevelopers.co
        </a>
      </div>
    </div>
    <div class="container footer__bar">
      <span>© 2026 Premium Developers. All rights reserved.</span>
      <span>
        <a href="/services.html">Services</a>
        <a href="/contact">Contact</a>
        <a href="/sitemap/">Site map</a>
        <a href="/privacy-policy.html">Privacy</a>
        <a href="/terms-and-conditions.html">Terms</a>
        <a href="#" data-pd-open-cookie-settings>Cookie settings</a>
      </span>
    </div>
  </footer>`;
}

module.exports = {
  siteChromeIcons,
  siteChromeNav,
  siteChromeFooter
};
