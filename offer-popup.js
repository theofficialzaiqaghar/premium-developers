(() => {
  const currentPath = window.location.pathname.replace(/\/+$/, '');
  if (currentPath === '/special-offer' || currentPath === '/special-offer.html') return;

  const storageKey = 'pd-50-percent-offer-seen';
  let seenInMemory = false;
  let returnFocus;
  let dialog;

  function hasBeenSeen() {
    if (seenInMemory) return true;
    try {
      return window.sessionStorage.getItem(storageKey) === 'shown';
    } catch {
      return document.cookie.split('; ').some(cookie => cookie.startsWith(`${storageKey}=shown`));
    }
  }

  function markSeen() {
    seenInMemory = true;
    try {
      window.sessionStorage.setItem(storageKey, 'shown');
    } catch {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${storageKey}=shown; path=/; SameSite=Lax${secure}`;
    }
  }

  function closePopup() {
    if (dialog?.open) dialog.close();
  }

  function createDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'offer-popup-dialog';
    dialog.setAttribute('aria-labelledby', 'offer-popup-title');
    dialog.setAttribute('aria-describedby', 'offer-popup-description');
    dialog.innerHTML = `
      <section class="offer-popup">
        <button class="offer-popup__close" type="button" aria-label="Close offer popup">&times;</button>
        <p class="offer-popup__eyebrow">A special offer from Premium Developers</p>
        <h2 id="offer-popup-title">Get 50% OFF Your Next Digital Growth Project</h2>
        <p class="offer-popup__description" id="offer-popup-description">Upgrade your website with professional optimization, SEO, and content writing services — now at 50% off for a limited time.</p>
        <div class="offer-popup__discount" aria-label="50 percent off">
          <strong>50% <span>OFF</span></strong>
          <span>Selected digital growth services</span>
        </div>
        <ul class="offer-popup__services">
          <li>Website Speed &amp; Performance Optimization</li>
          <li>SEO Optimization</li>
          <li>Professional Website Content Writing</li>
        </ul>
        <div class="offer-popup__actions">
          <a class="btn btn--primary" href="/special-offer/">Claim My 50% OFF <span aria-hidden="true">→</span></a>
          <button class="btn btn--ghost" type="button" data-offer-dismiss>No Thanks</button>
        </div>
      </section>`;
    document.body.append(dialog);

    dialog.querySelector('.offer-popup__close').addEventListener('click', closePopup);
    dialog.querySelector('[data-offer-dismiss]').addEventListener('click', closePopup);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closePopup();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePopup();
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closePopup();
    });
    dialog.addEventListener('close', () => {
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
    });
  }

  function showPopup() {
    if (hasBeenSeen()) return;
    if (document.visibilityState === 'hidden') {
      const showWhenVisible = () => {
        if (document.visibilityState !== 'visible') return;
        document.removeEventListener('visibilitychange', showWhenVisible);
        showPopup();
      };
      document.addEventListener('visibilitychange', showWhenVisible);
      return;
    }

    const existingDialog = document.querySelector('dialog[open]');
    if (existingDialog) {
      existingDialog.addEventListener('close', showPopup, { once: true });
      return;
    }

    if (!dialog) createDialog();
    markSeen();
    returnFocus = document.activeElement;
    dialog.showModal();
    dialog.querySelector('.offer-popup__close').focus();
  }

  window.setTimeout(showPopup, 5000);
})();
