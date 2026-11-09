(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.querySelector('.nav__links');
  const serviceToggle = document.querySelector('.nav__dropdown-toggle');
  const serviceMenu = document.querySelector('.nav__dropdown-menu');
  const backToTop = document.querySelector('.back-to-top');
  const video = document.querySelector('.hero__video');
  const handleVideoPlayError = error => {
    if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
      console.error('Hero video playback failed:', error);
    }
  };

  const setMenuOpen = open => {
    if (!nav || !toggle) return;
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };

  const setServicesOpen = open => {
    if (!serviceToggle || !serviceMenu) return;
    serviceToggle.setAttribute('aria-expanded', String(open));
    serviceMenu.hidden = !open;
  };

  serviceToggle?.addEventListener('click', () => {
    setServicesOpen(serviceToggle.getAttribute('aria-expanded') !== 'true');
  });

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenuOpen(open);
    if (open) menu?.querySelector('a')?.focus();
  });

  menu?.addEventListener('click', event => {
    if (event.target.closest('.nav__dropdown-menu a')) setServicesOpen(false);
    if (event.target.closest('a')) setMenuOpen(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && serviceToggle?.getAttribute('aria-expanded') === 'true') {
      setServicesOpen(false);
      serviceToggle.focus();
    }
    if (event.key === 'Escape' && nav?.classList.contains('is-open')) {
      setMenuOpen(false);
      toggle?.focus();
    }
  });

  document.addEventListener('click', event => {
    if (serviceMenu && !event.target.closest('.nav__dropdown')) setServicesOpen(false);
    if (nav?.classList.contains('is-open') && !nav.contains(event.target)) {
      setMenuOpen(false);
    }
  });

  const desktopNav = window.matchMedia('(min-width: 901px)');
  desktopNav.addEventListener?.('change', event => {
    if (event.matches) {
      setMenuOpen(false);
      setServicesOpen(false);
    }
  });

  const navLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  const sections = navLinks
    .map(link => [link, document.getElementById(link.getAttribute('href').slice(1))])
    .filter(([, section]) => section);

  if ('IntersectionObserver' in window && sections.length) {
    const activeSectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const [link, section] of sections) {
          const active = section === entry.target;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(([, section]) => activeSectionObserver.observe(section));
  }

  let scrollTicking = false;
  const updateScrollUI = () => {
    const y = window.scrollY;
    nav?.classList.toggle('is-scrolled', y > 10);
    if (backToTop) backToTop.hidden = y < 600;
    scrollTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUI);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateScrollUI();
  });
  updateScrollUI();

  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  if (video) {
    const videoSrc = video.getAttribute('data-src');
    let videoLoaded = Boolean(video.querySelector('source[src]'));
    const ensureVideoSource = () => {
      if (!videoSrc || videoLoaded) return;
      if (!video.querySelector('source')) {
        const source = document.createElement('source');
        source.src = videoSrc;
        source.type = 'video/mp4';
        video.appendChild(source);
        video.load();
      }
      videoLoaded = true;
    };

    if (reduceMotion || !('IntersectionObserver' in window)) {
      video.pause();
    } else {
      const videoObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && !document.hidden) {
            ensureVideoSource();
            video.play().catch(handleVideoPlayError);
          } else {
            video.pause();
          }
        }
      }, { threshold: .15, rootMargin: '120px 0px' });
      videoObserver.observe(video);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) video.pause();
        else if (video.getBoundingClientRect().bottom > 0 &&
          video.getBoundingClientRect().top < window.innerHeight) {
          ensureVideoSource();
          video.play().catch(handleVideoPlayError);
        }
      });
    }
  }

  const revealTargets = document.querySelectorAll(
    '.services .head > *, .svc, .about__copy > *, .mini__c, .about__img, .quote-card, ' +
    '.why .head > *, .process-step, .work .head > *, .proj, .stats__grid > div, .book__card, ' +
    '.contact .head > *, .cc, .testi .head > *, .quote, .cta__in > *, .footer__grid > *'
  );

  if (!reduceMotion && 'IntersectionObserver' in window && revealTargets.length) {
    document.documentElement.classList.add('has-motion');
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -40px 0px', threshold: .08 });
    revealTargets.forEach(target => {
      target.setAttribute('data-reveal', '');
      revealObserver.observe(target);
    });
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || anchor.getAttribute('href') === '#') return;
    const id = anchor.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', `#${id}`);
    else location.hash = id;
  });

  const isInternalProjectHref = href => {
    if (!href) return false;
    if (href.startsWith('#')) return true;
    if (href.startsWith('/')) return true;
    return /^(?:\.\.\/|\.\/|work\/)/.test(href);
  };

  const primaryProjectLink = card => {
    const links = [...card.querySelectorAll('.proj__body a.link')];
    return (
      links.find(a => !a.classList.contains('proj__case-study') && isInternalProjectHref(a.getAttribute('href'))) ||
      links.find(a => a.classList.contains('proj__case-study') && isInternalProjectHref(a.getAttribute('href'))) ||
      links[0]
    );
  };

  const followProjectLink = link => {
    if (!link) return;
    if (link.target === '_blank') window.open(link.href, '_blank', 'noopener,noreferrer');
    else window.location.assign(link.href);
  };

  document.querySelectorAll('.card.proj').forEach(card => {
    card.classList.add('proj--interactive');
    const title = card.querySelector('.proj h3')?.textContent?.trim();
    if (title) card.setAttribute('aria-label', `${title} — open project`);

    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      followProjectLink(primaryProjectLink(card));
    });

    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target.closest('a')) return;
      event.preventDefault();
      followProjectLink(primaryProjectLink(card));
    });
  });
})();
