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
  let mobileScrollActive = false;

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
      if (isMobileLayout() && mobileScrollActive && activeIndex >= 0) return;
      if (!isMobileLayout()) setActive(-1);
    });
  };

  const bindTap = () => {
    root.addEventListener('click', event => {
      const step = event.target.closest('[data-process-step]');
      if (!step) return;
      const index = resolveIndex(step);
      mobileScrollActive = false;
      tappedIndex = index;
      setActive(index);
    });
  };

  const bindMobileScrollProgress = () => {
    if (reduceMotion || !('IntersectionObserver' in window)) return;

    const visibleSteps = new Set();
    let lastScrollIndex = 0;

    const stepObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idx = resolveIndex(entry.target);
          if (idx < 0) return;
          if (entry.isIntersecting) visibleSteps.add(idx);
          else visibleSteps.delete(idx);
        });

        if (!isMobileLayout() || (tappedIndex >= 0 && !mobileScrollActive)) return;

        if (visibleSteps.size === 0) {
          setActive(lastScrollIndex);
          return;
        }

        lastScrollIndex = Math.max(...visibleSteps);
        mobileScrollActive = true;
        setActive(lastScrollIndex);
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: '-12% 0px -22% 0px'
      }
    );

    steps.forEach(step => stepObserver.observe(step));

    mobileMq.addEventListener('change', () => {
      if (!isMobileLayout()) {
        visibleSteps.clear();
        tappedIndex = -1;
        mobileScrollActive = false;
        setActive(-1);
      } else if (tappedIndex < 0) {
        mobileScrollActive = true;
      }
    });
  };

  steps.forEach(step => {
    if (!step.hasAttribute('tabindex')) step.setAttribute('tabindex', '0');
  });

  bindHover();
  bindFocus();
  if (isCoarse) bindTap();
  bindMobileScrollProgress();

  if (isMobileLayout() && tappedIndex < 0) {
    mobileScrollActive = true;
    setActive(0);
  }

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
