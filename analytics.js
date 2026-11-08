(() => {
  /**
   * Push events for Google Tag Manager (Custom Event triggers).
   * See docs/GOOGLE-ADS-READINESS.md for GTM / Google Ads setup.
   *
   * Primary Google Ads conversion (recommended trigger):
   *   Event name: generate_lead (+ form_submit mirror for GA4/GTM setups that listen for form_submit)
   *   Fire only from successful /api/contact submissions (contact, service_inquiry, home_inquiry).
   *
   * Secondary / micro-conversions:
   * - click_whatsapp, click_to_call, cta_click, contact_page_view
   * - special_offer_submit, exit_offer_submit (do not use as primary Ads conversion)
   * - pd_consent_update (consent banner)
   */
  window.dataLayer = window.dataLayer || [];
  window.__pdTrackedEvents = window.__pdTrackedEvents || new Set();

  window.pdTrack = (event, params = {}) => {
    window.dataLayer.push({
      event,
      page_path: window.location.pathname,
      page_location: window.location.href,
      ...params
    });
  };

  /** Fire a conversion-related event at most once per page load for a given key. */
  window.pdTrackOnce = (event, params = {}, dedupeKey = '') => {
    const key = dedupeKey || `${event}:${params.form_name || ''}:${params.service_name || ''}`;
    if (window.__pdTrackedEvents.has(key)) return;
    window.__pdTrackedEvents.add(key);
    window.pdTrack(event, params);
  };

  /** Successful lead/contact submit: fires generate_lead and GA4-style form_submit once per dedupe key. */
  window.pdTrackLeadSuccess = (params = {}, dedupeKey = '') => {
    const formName = params.form_name || 'contact';
    const key = dedupeKey || `lead:${formName}:${params.service_name || 'general'}`;
    const payload = {
      lead_outcome: 'success',
      ...params
    };
    window.pdTrackOnce('generate_lead', payload, `generate_lead:${key}`);
    window.pdTrackOnce(
      'form_submit',
      {
        ...payload,
        form_destination: params.form_destination || ''
      },
      `form_submit:${key}`
    );
  };

  /** Any successful form (offer, exit, etc.): form_submit + optional custom event name. */
  window.pdTrackFormSuccess = (customEvent, params = {}, dedupeKey = '') => {
    const formName = params.form_name || 'unknown';
    const key = dedupeKey || `form:${formName}`;
    const payload = { lead_outcome: 'success', ...params };
    if (customEvent) {
      window.pdTrackOnce(customEvent, payload, `${customEvent}:${key}`);
    }
    window.pdTrackOnce(
      'form_submit',
      {
        ...payload,
        form_destination: params.form_destination || ''
      },
      `form_submit:${key}`
    );
  };
})();
