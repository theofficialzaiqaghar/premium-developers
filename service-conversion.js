(() => {
  const SCROLL_BAR_THRESHOLD = 0.6;
  const ENGAGE_SCROLL = 0.25;
  const ENGAGE_MS = 15000;
  const SCROLL_BAR_KEY = 'pd_service_scroll_bar_dismissed';

  const track = window.pdTrack || (() => {});
  const trackOnce = window.pdTrackOnce || track;

  function serviceSlug() {
    const path = window.location.pathname.replace(/\/$/, '');
    const match = path.match(/^\/services\/([^/]+)\.html$/i);
    return match ? match[1].toLowerCase() : '';
  }

  function isServiceDetail() {
    return Boolean(serviceSlug());
  }

  function isServicesHub() {
    const path = window.location.pathname.replace(/\/$/, '');
    return path === '/services.html' || path === '/services';
  }

  function isCaseStudy() {
    return /\/case-studies\/[^/]+\/?$/i.test(window.location.pathname);
  }

  function getProfile() {
    const cfg = window.PD_SERVICE_CONVERSION || {};
    if (isServicesHub()) return cfg.hub || null;
    const slug = serviceSlug();
    return cfg.bySlug?.[slug] || null;
  }

  function scrollDepth() {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    return scrollTop / max;
  }

  function markEngaged() {
    window.PD_SERVICE_ENGAGED = true;
    try {
      sessionStorage.setItem('pd_service_engaged', '1');
    } catch {
      /* ignore */
    }
  }

  function initEngagement() {
    if (!isServiceDetail() && !isServicesHub()) return;
    const start = Date.now();
    let engaged = false;

    const check = () => {
      if (engaged) return;
      if (scrollDepth() >= ENGAGE_SCROLL || Date.now() - start >= ENGAGE_MS) {
        engaged = true;
        markEngaged();
      }
    };

    window.addEventListener('scroll', check, { passive: true });
    window.setTimeout(check, ENGAGE_MS);
    check();
  }

  function initScrollBar() {
    const profile = getProfile();
    if (!profile?.scrollBar || (!isServiceDetail() && !isServicesHub())) return;

    const pathKey = `${SCROLL_BAR_KEY}:${window.location.pathname}`;
    try {
      if (sessionStorage.getItem(pathKey) === '1') return;
    } catch {
      /* ignore */
    }

    const bar = document.createElement('div');
    bar.className = 'pd-service-scroll-cta';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Project discussion prompt');

    const contactReason = profile.contactReason || 'Project%20discussion';
    const href = `/contact?reason=${contactReason}`;

    bar.innerHTML = `
      <div class="pd-service-scroll-cta__inner">
        <p class="pd-service-scroll-cta__copy">
          ${profile.scrollBar.headline}
          <span>${profile.scrollBar.action}</span>
        </p>
        <div class="pd-service-scroll-cta__actions">
          <a class="pd-service-scroll-cta__link" href="${href}">${profile.scrollBar.action}</a>
          <button type="button" class="pd-service-scroll-cta__dismiss" aria-label="Dismiss">×</button>
        </div>
      </div>`;

    let shown = false;
    const onScroll = () => {
      if (shown) return;
      if (scrollDepth() >= SCROLL_BAR_THRESHOLD) {
        shown = true;
        bar.classList.add('is-visible');
        trackOnce(
          'service_scroll_cta_view',
          { page_path: window.location.pathname },
          `service_scroll_cta_view:${window.location.pathname}`
        );
        window.removeEventListener('scroll', onScroll);
      }
    };

    bar.querySelector('.pd-service-scroll-cta__dismiss')?.addEventListener('click', () => {
      bar.classList.remove('is-visible');
      try {
        sessionStorage.setItem(pathKey, '1');
      } catch {
        /* ignore */
      }
    });

    bar.querySelector('.pd-service-scroll-cta__link')?.addEventListener('click', () => {
      track('service_scroll_cta_click', { page_path: window.location.pathname });
    });

    document.body.appendChild(bar);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initCaseStudyCta() {
    if (!isCaseStudy()) return;

    const section = document.querySelector('.case-study-similar-cta, .service-cta.case-study-similar-cta');
    if (!section) return;

    const reveal = () => {
      section.classList.add('is-revealed');
      section.removeAttribute('hidden');
    };

    const gallery = document.getElementById('gallery') || document.querySelector('#gallery, .case-study-gallery');
    if (gallery && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            reveal();
            io.disconnect();
          }
        },
        { root: null, threshold: 0.2 }
      );
      io.observe(gallery);
      return;
    }

    const onScroll = () => {
      if (scrollDepth() >= 0.55) {
        reveal();
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  window.PD_getServiceProfile = getProfile;

  initEngagement();
  initScrollBar();
  initCaseStudyCta();
})();
