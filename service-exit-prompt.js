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
    return `/contact?reason=${reason}`;
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
        <div class="pd-service-exit" style="position:relative">
          <button type="button" class="pd-service-exit__close" aria-label="Close">&times;</button>
          <p class="pd-service-exit__eyebrow">Before you go…</p>
          <h2 class="pd-service-exit__title" id="pd-service-exit-title">Have a website project in mind?</h2>
          <p class="pd-service-exit__text">Let's discuss what's possible—we reply with clear scope and next steps.</p>
          <div class="pd-service-exit__actions">
            <a class="btn btn--primary pd-service-exit__primary" href="${contactHref()}">Talk to Our Team</a>
            <button type="button" class="btn btn--ghost pd-service-exit__ghost">Stay on page</button>
          </div>
        </div>`;
      document.body.appendChild(dialog);

      dialog.querySelector('.pd-service-exit__close')?.addEventListener('click', () => dialog.close());
      dialog.querySelector('.pd-service-exit__ghost')?.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        dialog.close();
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
