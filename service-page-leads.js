(() => {
  const { mountServiceInquiry } = window.PDLeadForms || {};
  if (!mountServiceInquiry) return;

  const track = window.pdTrack || (() => {});
  const trackOnce = window.pdTrackOnce || track;

  const SERVICE_HEADLINES = {
    'WordPress Development': 'Request a WordPress project estimate',
    'Elementor Development': 'Request an Elementor project quote',
    'WooCommerce Development': 'Request a WooCommerce store quote',
    'Website Redesign': 'Request a redesign estimate',
    'Custom Development': 'Request a custom development quote',
    'Custom WordPress Plugin Development': 'Request a custom plugin quote',
    'Landing Pages': 'Request a landing page quote',
    'Speed & Performance': 'Request a performance audit quote',
    'Maintenance & Support': 'Request maintenance & support pricing',
    'Essential Web': 'Request an Essential Web package quote',
    'Custom Apps': 'Request a custom app estimate',
    'Enterprise': 'Discuss enterprise requirements'
  };

  function scrollToInquiry(event) {
    const target = document.getElementById('project-inquiry');
    if (!target) return;
    const href = event.currentTarget.getAttribute('href') || '';
    if (!href.includes('#project-inquiry')) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    const focusable = target.querySelector('input, textarea, select, button');
    if (focusable) window.setTimeout(() => focusable.focus({ preventScroll: true }), 400);
    track('cta_click', {
      cta_text: (event.currentTarget.textContent || '').trim().slice(0, 80),
      cta_location: event.currentTarget.dataset.ctaLocation || 'service_page',
      link_target: '#project-inquiry',
      service_name: document.body.dataset.pdPrimaryService || ''
    });
  }

  function bindLeadCtas() {
    document.querySelectorAll('a[href="#project-inquiry"], a.pd-lead-cta').forEach((link) => {
      link.addEventListener('click', scrollToInquiry);
    });
  }

  function bindTelTracking() {
    document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
      link.addEventListener('click', () => {
        trackOnce(
          'click_to_call',
          {
            phone_number: link.getAttribute('href'),
            link_text: (link.textContent || '').trim().slice(0, 80),
            page_path: window.location.pathname
          },
          `click_to_call:${window.location.pathname}`
        );
      });
    });
  }

  function ensureInquirySection() {
    if (document.getElementById('project-inquiry')) return;
    const serviceName = document.body.dataset.pdPrimaryService;
    if (!serviceName) return;
    const main = document.getElementById('main-content');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'service-wrap service-inquiry';
    section.id = 'project-inquiry';
    section.setAttribute('aria-labelledby', 'project-inquiry-title');
    section.innerHTML = `
<div class="service-inquiry__grid">
  <div class="service-inquiry__copy">
    <span class="service-kicker">GET A FREE QUOTE</span>
    <h2 id="project-inquiry-title">${SERVICE_HEADLINES[serviceName] || 'Request a project estimate'}</h2>
    <p>Share your goals and timeline. We reply with practical next steps — usually within two business days.</p>
    <ul class="service-inquiry__points">
      <li>No obligation project review</li>
      <li>Clear scope and pricing discussion</li>
      <li>Same secure form as our main contact page</li>
    </ul>
    <p class="service-inquiry__email">Prefer email? <a href="mailto:hello@premiumdevelopers.co">hello@premiumdevelopers.co</a></p>
  </div>
  <div class="service-inquiry__form contact-form-card" data-pd-lead-form-mount></div>
</div>`;
    const anchor = main.querySelector('.service-cta')?.closest('section') || main.lastElementChild;
    if (anchor) main.insertBefore(section, anchor);
    else main.appendChild(section);
  }

  function mountForms() {
    document.querySelectorAll('[data-pd-lead-form-mount]').forEach((mountEl) => {
      const section = mountEl.closest('[data-pd-service], #project-inquiry');
      const serviceName =
        mountEl.dataset.pdService ||
        section?.dataset?.pdService ||
        document.body.dataset.pdPrimaryService;
      if (serviceName) mountServiceInquiry(mountEl, serviceName);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureInquirySection();
    mountForms();
    bindLeadCtas();
    bindTelTracking();
  });
})();
