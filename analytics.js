(() => {
  /**
   * Push events for Google Tag Manager (Custom Event triggers).
   * Configure GA4 Event tags in GTM for each `event` name below.
   */
  window.pdTrack = (event, params = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event,
      page_path: window.location.pathname,
      page_location: window.location.href,
      ...params
    });
  };
})();
