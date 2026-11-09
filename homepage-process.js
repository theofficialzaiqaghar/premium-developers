(() => {
  const root = document.querySelector('[data-process-timeline]');
  if (!root) return;

  const progressPaths = [...root.querySelectorAll('[data-process-progress]')];
  const steps = [...root.querySelectorAll('.process-step[data-process-step]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;

  let activeIndex = -1;
  let tappedIndex = -1;

  const fillForIndex = index => {
    if (index < 0) return 0;
    return Math.min(1, (index + 1) / steps.length);
  };

  const setActive = index => {
    activeIndex = index;
    const fill = fillForIndex(index);
    root.style.setProperty('--process-fill', String(fill));
    root.classList.toggle('is-step-active', index >= 0);

    steps.forEach((step, i) => {
      const on = i === index;
      step.classList.toggle('is-active', on);
      if (on) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });

  };

  const resolveIndex = el => {
    if (!el) return -1;
    const raw = el.getAttribute('data-process-step');
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : -1;
  };

  const bindHover = () => {
    if (isCoarse) return;

    steps.forEach(step => {
      step.addEventListener('mouseenter', () => setActive(resolveIndex(step)));
    });

    root.addEventListener('mouseleave', () => setActive(-1));
  };

  const bindFocus = () => {
    root.addEventListener('focusin', event => {
      const step = event.target.closest('[data-process-step]');
      if (step) setActive(resolveIndex(step));
    });

    root.addEventListener('focusout', event => {
      if (root.contains(event.relatedTarget)) return;
      setActive(isCoarse && tappedIndex >= 0 ? tappedIndex : -1);
    });
  };

  const bindTap = () => {
    root.addEventListener('click', event => {
      const step = event.target.closest('[data-process-step]');
      if (!step) return;
      const index = resolveIndex(step);
      tappedIndex = tappedIndex === index ? -1 : index;
      setActive(tappedIndex);
    });
  };

  steps.forEach(step => {
    if (!step.hasAttribute('tabindex')) step.setAttribute('tabindex', '0');
  });

  bindHover();
  bindFocus();
  if (isCoarse) bindTap();

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          root.classList.add('is-visible');
          io.unobserve(root);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(root);
  } else {
    root.classList.add('is-visible');
  }

  progressPaths.forEach(path => path.setAttribute('role', 'presentation'));
})();
