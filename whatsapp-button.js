(() => {
  if (document.querySelector('.pd-whatsapp-widget') || document.querySelector('.pd-whatsapp-fab')) return;

  const config = window.PD_WHATSAPP || {};
  const rawNumber = String(config.number || '').replace(/\D/g, '');
  if (!rawNumber) return;

  const track = window.pdTrack || (() => {});
  const trackOnce = window.pdTrackOnce || track;

  const TEASER_SESSION_KEY = 'pd_wa_service_teaser_seen';
  const servicePageConfig = config.servicePage || {};

  function isServiceDetailPage() {
    const path = window.location.pathname.replace(/\/$/, '');
    return /^\/services\/[^/]+\.html$/i.test(path);
  }

  function isServicesHubPage() {
    const path = window.location.pathname.replace(/\/$/, '');
    return path === '/services.html' || path === '/services';
  }

  function isServiceContext() {
    return isServiceDetailPage() || isServicesHubPage();
  }

  function serviceLabel() {
    const fromBody = document.body.getAttribute('data-pd-primary-service');
    if (fromBody) return fromBody.trim();
    const h1 = document.querySelector('main h1, .service-hero h1, h1');
    return h1?.textContent?.trim() || 'website project';
  }

  function buildMessage() {
    if (isServiceDetailPage()) {
      const name = serviceLabel();
      return (
        config.serviceMessageTemplate?.replace('{service}', name) ||
        `Hi Premium Developers, I'm viewing your ${name} service and would like to discuss my project on WhatsApp.`
      );
    }
    if (isServicesHubPage()) {
      return (
        config.servicesHubMessage ||
        "Hi Premium Developers, I'm browsing your services and would like to discuss which option fits my project on WhatsApp."
      );
    }
    return config.defaultMessage || "Hi Premium Developers, I'm interested in your website development services.";
  }

  function waHref(message) {
    const params = new URLSearchParams({ text: message });
    return `https://wa.me/${rawNumber}?${params.toString()}`;
  }

  const message = buildMessage();
  const href = waHref(message);
  const hrefBase = href.split('?')[0];
  const enhanced = isServiceContext();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const teaserSeen = sessionStorage.getItem(TEASER_SESSION_KEY) === '1';

  const widget = document.createElement('div');
  widget.className = 'pd-whatsapp-widget';
  if (enhanced) widget.classList.add('pd-whatsapp-widget--service');
  widget.setAttribute('data-pd-whatsapp-root', 'true');

  if (enhanced && !reducedMotion) {
    const rings = document.createElement('div');
    rings.className = 'pd-whatsapp-fab__rings';
    rings.setAttribute('aria-hidden', 'true');
    rings.innerHTML =
      '<span class="pd-whatsapp-fab__ring"></span><span class="pd-whatsapp-fab__ring pd-whatsapp-fab__ring--delay"></span>';
    widget.appendChild(rings);
  }

  let teaserEl = null;
  let dismissBtn = null;

  if (enhanced && !teaserSeen) {
    const ctaCopy = isServicesHubPage()
      ? config.servicesHubCtaText || servicePageConfig.ctaText
      : servicePageConfig.ctaText || 'Need this service? Chat on WhatsApp';

    teaserEl = document.createElement('a');
    teaserEl.className = 'pd-whatsapp-fab__teaser';
    teaserEl.href = href;
    teaserEl.target = '_blank';
    teaserEl.rel = 'noopener noreferrer';
    teaserEl.setAttribute('aria-label', ctaCopy);
    teaserEl.innerHTML = `<span class="pd-whatsapp-fab__teaser-text">${ctaCopy}</span>`;

    dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'pd-whatsapp-fab__teaser-dismiss';
    dismissBtn.setAttribute('aria-label', 'Dismiss WhatsApp suggestion');
    dismissBtn.innerHTML = '<span aria-hidden="true">×</span>';
    teaserEl.appendChild(dismissBtn);

    const markTeaserSeen = () => {
      try {
        sessionStorage.setItem(TEASER_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
    };

    const hideTeaser = () => {
      if (!teaserEl) return;
      teaserEl.classList.add('pd-whatsapp-fab__teaser--hide');
      widget.classList.remove('pd-whatsapp-widget--teaser-live');
      window.setTimeout(() => {
        teaserEl?.remove();
        teaserEl = null;
        dismissBtn = null;
      }, 320);
    };

    dismissBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      markTeaserSeen();
      hideTeaser();
      widget.classList.remove('pd-whatsapp-widget--teaser-live');
    });

    dismissBtn.addEventListener('pointerdown', (event) => event.stopPropagation());

    teaserEl.addEventListener('click', (event) => {
      if (event.target.closest('.pd-whatsapp-fab__teaser-dismiss')) return;
      markTeaserSeen();
      trackOnce(
        'click_whatsapp',
        { link_url: hrefBase, page_path: window.location.pathname, placement: 'service_teaser' },
        `click_whatsapp_teaser:${window.location.pathname}`
      );
    });

    widget.appendChild(teaserEl);

    window.setTimeout(() => {
      if (!teaserEl || sessionStorage.getItem(TEASER_SESSION_KEY) === '1') return;
      widget.classList.add('pd-whatsapp-widget--teaser-live');
      window.setTimeout(() => {
        if (sessionStorage.getItem(TEASER_SESSION_KEY) !== '1') {
          markTeaserSeen();
          hideTeaser();
        }
      }, 14000);
    }, 2800);
  }

  const link = document.createElement('a');
  link.className = 'pd-whatsapp-fab';
  if (enhanced && !reducedMotion) link.classList.add('pd-whatsapp-fab--attention');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute(
    'aria-label',
    enhanced ? 'Chat about this service on WhatsApp' : 'Chat with us on WhatsApp'
  );
  link.setAttribute('data-pd-whatsapp', 'true');

  link.innerHTML = `
    <span class="pd-whatsapp-fab__tooltip" role="tooltip">${
      enhanced ? 'Message us on WhatsApp' : 'Chat with us on WhatsApp'
    }</span>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>`;

  link.addEventListener('click', () => {
    if (teaserEl) {
      try {
        sessionStorage.setItem(TEASER_SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    trackOnce(
      'click_whatsapp',
      {
        link_url: hrefBase,
        page_path: window.location.pathname,
        placement: enhanced ? 'service_fab' : 'fab'
      },
      `click_whatsapp:${window.location.pathname}`
    );
  });

  widget.appendChild(link);
  document.body.appendChild(widget);

  if (enhanced && !reducedMotion && !teaserSeen) {
    window.setTimeout(() => {
      widget.classList.add('pd-whatsapp-widget--settled');
    }, 5200);
  }
})();
