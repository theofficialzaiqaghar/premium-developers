(() => {
  const mount = document.querySelector('[data-pd-home-inquiry]');
  if (!mount || !window.PDLeadForms?.mountHomeInquiry) return;

  window.PDLeadForms.mountHomeInquiry(mount);

  const scrollLinks = document.querySelectorAll('a[href="#home-project-inquiry"], a[href="#project-inquiry"]');
  scrollLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href') || '';
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      (window.pdTrack || (() => {}))('cta_click', {
        cta_text: (link.textContent || '').trim().slice(0, 80),
        cta_location: 'homepage',
        link_target: hash
      });
    });
  });
})();
