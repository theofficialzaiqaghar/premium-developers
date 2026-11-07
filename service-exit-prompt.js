(() => {
  const SESSION_KEY = 'pd_service_exit_prompt_shown';
  const isMobile =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches;

  function isServicePage() {
    const path = window.location.pathname.replace(/\/$/, '');
    return /^\/services\/[^/]+\.html$/i.test(path) || path === '/services.html' || path === '/services';
  }

  if (isMobile || !isServicePage()) return;

  const track = window.pdTrack || (() => {});
  const trackOnce = window.pdTrackOnce || track;

  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;
  } catch {
    return;
  }

  let shown = false;
  let lastY = null;
  const startedAt = Date.now();
  let dialog;

  function isEngaged() {
    if (window.PD_SERVICE_ENGAGED) return true;
    try {
      return sessionStorage.getItem('pd_service_engaged') === '1';
    } catch {
      return false;
    }
  }

  function contactHref() {
    const profile = window.PD_getServiceProfile?.();
    const reason = profile?.contactReason || 'Project%20discussion';
    if (typeof window.PD_buildContactUrl === 'function') {
      return window.PD_buildContactUrl(reason);
    }
    return `/contact?reason=${reason}#contact-form`;
  }

  function closePrompt() {
    if (!dialog?.open) return;
    dialog.classList.add('pd-service-exit-dialog--closing');
    window.setTimeout(() => {
      dialog.close();
      dialog.classList.remove('pd-service-exit-dialog--closing');
      document.body.classList.remove('pd-service-exit-open');
    }, 220);
  }

  function openPrompt() {
    if (shown || !isEngaged() || Date.now() - startedAt < 4000) return;

    shown = true;
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }

    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'pd-service-exit-dialog';
      dialog.setAttribute('aria-labelledby', 'pd-service-exit-title');
      dialog.innerHTML = `
        <div class="pd-service-exit">
          <div class="pd-service-exit__accent" aria-hidden="true"></div>
          <header class="pd-service-exit__head">
            <div class="pd-service-exit__brand">
              <img class="pd-service-exit__mark" src="/logo.svg" alt="" width="40" height="40" decoding="async">
              <span class="pd-service-exit__brand-text">Premium Developers</span>
            </div>
            <button type="button" class="pd-service-exit__close" aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <p class="pd-service-exit__eyebrow">Still exploring?</p>
          <h2 class="pd-service-exit__title" id="pd-service-exit-title">Have a website project in mind?</h2>
          <p class="pd-service-exit__text">Tell us what you need—we reply with honest scope and practical next steps. No pressure.</p>
          <div class="pd-service-exit__actions">
            <a class="btn btn--primary pd-service-exit__primary" href="${contactHref()}">Talk to our team</a>
            <button type="button" class="pd-service-exit__later">Continue browsing</button>
          </div>
        </div>`;
      document.body.appendChild(dialog);

      dialog.querySelector('.pd-service-exit__close')?.addEventListener('click', closePrompt);
      dialog.querySelector('.pd-service-exit__later')?.addEventListener('click', closePrompt);
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closePrompt();
      });
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        closePrompt();
      });
      dialog.querySelector('.pd-service-exit__primary')?.addEventListener('click', () => {
        track('service_exit_prompt_click', { page_path: window.location.pathname });
      });
    }

    trackOnce(
      'service_exit_prompt_view',
      { page_path: window.location.pathname },
      `service_exit_prompt_view:${window.location.pathname}`
    );
    document.body.classList.add('pd-service-exit-open');
    dialog.showModal();
  }

  document.addEventListener(
    'mousemove',
    (event) => {
      const towardTop = lastY !== null && event.clientY < lastY;
      if (towardTop && lastY > 40 && event.clientY <= 12) openPrompt();
      lastY = event.clientY;
    },
    { passive: true }
  );
})();
