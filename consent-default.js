/**
 * Google Consent Mode v2 defaults — must run before GTM loads.
 * Stored choices are restored here so tags respect consent on repeat visits.
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  gtag('set', 'ads_data_redaction', true);

  var STORAGE_KEY = 'pd_cookie_consent_v1';
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (parsed && parsed.analytics === true) {
      gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
    if (parsed && parsed.marketing === true) {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
  } catch (_) {
    /* ignore corrupt storage */
  }
})();
