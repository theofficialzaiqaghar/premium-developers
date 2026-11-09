(() => {
  const title = document.querySelector('[data-hero-title]');
  const rotator = document.querySelector('[data-hero-rotator]');
  if (!title) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const promises = ['Fast', 'High-Converting', 'SEO-Friendly', 'Business-Driven'];
  const DISPLAY_MS = 2800;
  const GAP_MS = 420;
  const REVEAL_STAGGER_MS = 68;

  const setState = state => {
    title.setAttribute('data-hero-state', state);
  };

  if (reduceMotion) {
    setState('revealed');
    if (rotator) {
      const track = rotator.querySelector('[data-hero-rotator-track]');
      const items = track ? [...track.children] : [];
      items.forEach((el, i) => {
        el.hidden = i !== 0;
      });
    }
    return;
  }

  document.documentElement.classList.add('has-motion');
  setState('reveal');

  const wordCount = title.querySelectorAll('.hero__word').length;
  const revealDoneMs = Math.min(1200, wordCount * REVEAL_STAGGER_MS + 520);

  const startRotator = () => {
    setState('revealed');
    if (!rotator) return;

    const track = rotator.querySelector('[data-hero-rotator-track]');
    if (!track) return;

    const items = [...track.children];
    if (!items.length) return;

    let index = 0;
    let timer = null;

    const applyIndex = (next, instant = false) => {
      index = next;
      if (instant) track.classList.add('is-instant');
      track.style.setProperty('--hero-rotator-index', String(index));
      if (instant) {
        requestAnimationFrame(() => track.classList.remove('is-instant'));
      }
      const live = rotator.querySelector('[data-hero-rotator-live]');
      if (live) live.textContent = promises[index];
    };

    const loop = () => {
      timer = window.setTimeout(() => {
        const next = (index + 1) % promises.length;
        applyIndex(next);
        loop();
      }, DISPLAY_MS + GAP_MS);
    };

    applyIndex(0, true);
    loop();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      } else {
        window.clearTimeout(timer);
        loop();
      }
    });
  };

  window.setTimeout(startRotator, revealDoneMs);
})();
