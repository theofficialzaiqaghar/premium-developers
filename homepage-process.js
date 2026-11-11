(() => {
  const root = document.querySelector('[data-process-timeline]');
  if (!root) return;

  const progressPaths = [...root.querySelectorAll('[data-process-progress]')];
  const steps = [...root.querySelectorAll('.process-step[data-process-step]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse =
    window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
  const mobileMq = window.matchMedia('(max-width: 900px)');
  const isMobileLayout = () => mobileMq.matches;

  let activeIndex = -1;
  let tappedIndex = -1;

  const fillForIndex = index => {
    if (index < 0) return 0;
    return Math.min(1, (index + 1) / steps.length);
  };

  const setProgressFill = fill => {
    const clamped = Math.min(1, Math.max(0, fill));
    root.style.setProperty('--process-fill', String(clamped));
    root.classList.toggle('is-step-active', clamped > 0.02);
  };

  const setActive = (index, options = {}) => {
    const { fill } = options;
    activeIndex = index;
    const resolvedFill = typeof fill === 'number' ? fill : fillForIndex(index);
    setProgressFill(resolvedFill);
    root.classList.toggle('is-step-active', index >= 0 || resolvedFill > 0.02);

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
      step.addEventListener('mouseenter', () => {
        if (isMobileLayout()) return;
        setActive(resolveIndex(step));
      });
    });

    root.addEventListener('mouseleave', () => {
      if (isMobileLayout()) return;
      setActive(-1);
    });
  };

  const bindFocus = () => {
    root.addEventListener('focusin', event => {
      const step = event.target.closest('[data-process-step]');
      if (step) setActive(resolveIndex(step));
    });

    root.addEventListener('focusout', event => {
      if (root.contains(event.relatedTarget)) return;
      if (tappedIndex >= 0) {
        setActive(tappedIndex);
        return;
      }
      if (isMobileLayout() && tappedIndex < 0 && activeIndex >= 0) return;
      if (!isMobileLayout()) setActive(-1);
    });
  };

  const bindTap = () => {
    root.addEventListener('click', event => {
      const step = event.target.closest('[data-process-step]');
      if (!step) return;
      tappedIndex = resolveIndex(step);
      setActive(tappedIndex);
    });
  };

  const syncMobileProgress = () => {
    if (!isMobileLayout() || tappedIndex >= 0) return;

    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return;

    const startY = vh * 0.88;
    const endY = vh * 0.18;
    const span = Math.max(1, rect.height + (startY - endY));
    const traveled = startY - rect.top;
    const fill = Math.min(1, Math.max(0, traveled / span));

    const focusY = vh * 0.4;
    let highlight = 0;
    let nearest = Infinity;
    steps.forEach((step, i) => {
      const r = step.getBoundingClientRect();
      const center = r.top + r.height * 0.5;
      const dist = Math.abs(center - focusY);
      if (dist < nearest) {
        nearest = dist;
        highlight = i;
      }
    });

    setActive(highlight, { fill });
  };

  const bindMobileScrollProgress = () => {
    if (reduceMotion) return;

    let ticking = false;
    const schedule = () => {
      if (!isMobileLayout() || tappedIndex >= 0) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        syncMobileProgress();
      });
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) schedule();
    });

    mobileMq.addEventListener('change', () => {
      if (!isMobileLayout()) {
        tappedIndex = -1;
        setActive(-1);
      } else if (tappedIndex < 0) {
        syncMobileProgress();
      }
    });

    schedule();
  };

  steps.forEach(step => {
    if (!step.hasAttribute('tabindex')) step.setAttribute('tabindex', '0');
  });

  bindHover();
  bindFocus();
  if (isCoarse) bindTap();
  bindMobileScrollProgress();

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          root.classList.add('is-visible');
          if (isMobileLayout() && tappedIndex < 0) syncMobileProgress();
          io.unobserve(root);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(root);

    const revealObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const delay = resolveIndex(entry.target) * 90;
          window.setTimeout(() => {
            entry.target.classList.add('is-revealed');
          }, reduceMotion ? 0 : delay);
          revealObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );

    if (!isMobileLayout()) {
      steps.forEach(step => revealObserver.observe(step));
    } else {
      steps.forEach(step => step.classList.add('is-revealed'));
    }
  } else {
    root.classList.add('is-visible');
    steps.forEach(step => step.classList.add('is-revealed'));
  }

  progressPaths.forEach(path => path.setAttribute('role', 'presentation'));
})();
