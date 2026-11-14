(() => {
  /**
   * Push events for Google Tag Manager (Custom Event triggers).
   * See docs/GOOGLE-ADS-READINESS.md for GTM / Google Ads setup.
   *
   * Primary Google Ads / GA4 lead conversion (recommended trigger):
   *   Event name: generate_lead
   *   Fire only from successful /api/contact submissions (contact, service_inquiry, home_inquiry)
   *   and successful special-offer submits; WhatsApp CTA uses generate_lead with method=whatsapp.
   *
   * Also mirrored as form_submit (lead_outcome: success) for GA4/GTM setups that listen for form_submit.
   *
   * Do NOT fire from this site (no CRM / checkout on this marketing site):
   *   - purchase — only if a real purchase occurs
   *   - close_convert_lead — only when a lead becomes a customer (CRM)
   *   - qualify_lead — only when a lead is marked qualified (CRM)
   * Mark generate_lead as a GA4 key event. Unmark unused key events if they never fire.
   *
   * Secondary / micro-conversions:
   * - click_whatsapp, click_to_call, cta_click, contact_page_view
   * - special_offer_submit, exit_offer_submit (do not use as primary Ads conversion alone)
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

  /**
   * Successful lead/contact submit: fires generate_lead and GA4-style form_submit once per dedupe key.
   * params.method defaults to "form" (use "whatsapp" for chat CTAs).
   */
  window.pdTrackLeadSuccess = (params = {}, dedupeKey = '') => {
    const formName = params.form_name || 'contact';
    const key = dedupeKey || `lead:${formName}:${params.service_name || 'general'}`;
    const payload = {
      lead_outcome: 'success',
      method: params.method || 'form',
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

  /**
   * WhatsApp CTA click: generate_lead (method=whatsapp) + click_whatsapp micro-event.
   * Does not imply a completed form; method distinguishes channel in GA4.
   */
  window.pdTrackWhatsAppClick = (params = {}, dedupeKey = '') => {
    const placement = params.placement || 'fab';
    const key = dedupeKey || `whatsapp:${placement}:${window.location.pathname}`;
    const payload = {
      method: 'whatsapp',
      lead_outcome: 'intent',
      form_name: 'whatsapp_cta',
      ...params
    };
    window.pdTrackOnce('generate_lead', payload, `generate_lead:${key}`);
    window.pdTrackOnce('click_whatsapp', payload, `click_whatsapp:${key}`);
  };

  /** Any successful form (offer, exit, etc.): form_submit + optional custom event name. */
  window.pdTrackFormSuccess = (customEvent, params = {}, dedupeKey = '') => {
    const formName = params.form_name || 'unknown';
    const key = dedupeKey || `form:${formName}`;
    const payload = {
      lead_outcome: 'success',
      method: params.method || 'form',
      ...params
    };
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
