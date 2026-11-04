(() => {
  /**
   * Push events for Google Tag Manager (Custom Event triggers).
   * Configure GA4 Event tags in GTM for each `event` name below.
   *
   * Suggested GTM custom events:
   * - generate_lead (conversion)
   * - cta_click
   * - click_to_call (conversion)
   * - contact_page_view
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
})();
