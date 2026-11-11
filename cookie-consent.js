(() => {
  const STORAGE_KEY = 'pd_cookie_consent_v1';

  function readChoice() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ...choice,
          updatedAt: new Date().toISOString()
        })
      );
    } catch {
      /* storage blocked */
    }
  }

  function applyConsent(choice) {
    const gtag = window.gtag;
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_storage: choice.marketing ? 'granted' : 'denied',
      ad_user_data: choice.marketing ? 'granted' : 'denied',
      ad_personalization: choice.marketing ? 'granted' : 'denied'
    });
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'pd_consent_update',
      consent_analytics: choice.analytics ? 'granted' : 'denied',
      consent_marketing: choice.marketing ? 'granted' : 'denied'
    });
  }

  function hideBanner(banner) {
    banner.hidden = true;
  }

  function getBannerElement() {
    const existing = document.getElementById('pd-cookie-banner');
    if (existing) return existing;

    const banner = document.createElement('aside');
    banner.id = 'pd-cookie-banner';
    banner.className = 'pd-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'pd-cookie-banner-title');
    banner.setAttribute('aria-live', 'polite');
    banner.innerHTML = `
      <span class="pd-cookie-banner__kicker">Privacy</span>
      <h2 class="pd-cookie-banner__title" id="pd-cookie-banner-title">Cookie preferences</h2>
      <p>We use essential cookies so the site works. If you agree, we also use analytics and advertising tools (Google Tag Manager, GA4, Google Ads, Google AdSense) to measure visits, show ads, and track leads. <a href="/privacy-policy.html">Privacy policy</a></p>
      <div class="pd-cookie-settings" id="pd-cookie-settings" hidden>
        <label><input type="checkbox" id="pd-consent-analytics" checked> Analytics cookies (measure site use and form performance)</label>
        <label><input type="checkbox" id="pd-consent-marketing"> Marketing &amp; advertising cookies (Google Ads, Google AdSense, measurement and remarketing)</label>
      </div>
      <div class="pd-cookie-banner__actions">
        <button type="button" class="pd-cookie-banner__accept" data-pd-consent="accept-all">Accept all</button>
        <button type="button" class="pd-cookie-banner__reject" data-pd-consent="reject">Reject non-essential</button>
        <button type="button" class="pd-cookie-banner__settings" data-pd-consent="toggle-settings">Manage choices</button>
        <button type="button" class="pd-cookie-banner__settings" id="pd-consent-save" hidden>Save choices</button>
      </div>`;

    document.body.appendChild(banner);
    return banner;
  }

  let bannerEventsBound = false;

  function bindBannerEvents(banner) {
    if (bannerEventsBound) return;
    bannerEventsBound = true;

    const settingsPanel = banner.querySelector('#pd-cookie-settings');
    const saveBtn = banner.querySelector('#pd-consent-save');
    const analyticsInput = banner.querySelector('#pd-consent-analytics');
    const marketingInput = banner.querySelector('#pd-consent-marketing');

    banner.querySelector('[data-pd-consent="accept-all"]')?.addEventListener('click', () => {
      commitChoice(banner, { analytics: true, marketing: true });
    });

    banner.querySelector('[data-pd-consent="reject"]')?.addEventListener('click', () => {
      commitChoice(banner, { analytics: false, marketing: false });
    });

    banner.querySelector('[data-pd-consent="toggle-settings"]')?.addEventListener('click', () => {
      const open = settingsPanel.hidden;
      settingsPanel.hidden = !open;
      saveBtn.hidden = !open;
    });

    saveBtn?.addEventListener('click', () => {
      commitChoice(banner, {
        analytics: Boolean(analyticsInput?.checked),
        marketing: Boolean(marketingInput?.checked)
      });
    });
  }

  function commitChoice(banner, choice) {
    saveChoice(choice);
    applyConsent(choice);
    hideBanner(banner);
  }

  function resetBannerUi(banner) {
    const settingsPanel = banner.querySelector('#pd-cookie-settings');
    const saveBtn = banner.querySelector('#pd-consent-save');
    const analyticsInput = banner.querySelector('#pd-consent-analytics');
    const marketingInput = banner.querySelector('#pd-consent-marketing');
    if (settingsPanel) settingsPanel.hidden = true;
    if (saveBtn) saveBtn.hidden = true;
    if (analyticsInput) analyticsInput.checked = true;
    if (marketingInput) marketingInput.checked = false;
  }

  function showBanner() {
    const banner = getBannerElement();
    if (!banner) return;
    bindBannerEvents(banner);
    resetBannerUi(banner);
    banner.hidden = false;
  }

  window.PDOpenCookieSettings = () => {
    applyConsent({ analytics: false, marketing: false });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    showBanner();
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-pd-open-cookie-settings]');
    if (!trigger) return;
    event.preventDefault();
    window.PDOpenCookieSettings();
  });

  if (!readChoice()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
