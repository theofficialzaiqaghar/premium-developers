(() => {
  const script = document.currentScript;
  const frequencyDays = Math.max(1, Number(script?.dataset.frequencyDays) || 30);
  const storageKey = 'pd-exit-feedback-shown';
  const debugMode = new URLSearchParams(window.location.search).get('exitIntentDebug') === '1';
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const startedAt = Date.now();
  let configReady = debugMode;
  let configAvailable = debugMode;
  let alreadyShown = false;
  let lastScrollY = window.scrollY;
  let hasBrowsedDown = false;
  let lastPointerY = null;
  let dialog;
  let form;
  let status;
  let submitButton;
  let returnFocus;
  let discountPercent = 35;
  let submissionId = createSubmissionId();

  function createSubmissionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 256); });
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function hasBeenShown() {
    if (debugMode) return false;
    try {
      const shownAt = Number(window.localStorage.getItem(storageKey));
      if (shownAt && Date.now() - shownAt < frequencyDays * 86400000) return true;
      window.localStorage.removeItem(storageKey);
      return false;
    } catch (error) {
      console.warn('Exit popup frequency is limited to this tab because local storage is unavailable.', error);
      try {
        return window.sessionStorage.getItem(storageKey) === 'shown';
      } catch (sessionError) {
        console.warn('Exit popup disabled because browser storage is unavailable.', sessionError);
        return true;
      }
    }
  }

  function markShown() {
    if (debugMode) return;
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch (error) {
      console.warn('Could not save the exit popup frequency in local storage.', error);
      try {
        window.sessionStorage.setItem(storageKey, 'shown');
      } catch (sessionError) {
        console.warn('Could not save the exit popup frequency in session storage.', sessionError);
      }
    }
  }

  function renderPopup() {
    dialog = document.createElement('dialog');
    dialog.className = 'exit-feedback-dialog';
    dialog.setAttribute('aria-labelledby', 'exit-feedback-title');
    dialog.setAttribute('aria-describedby', 'exit-feedback-description');
    dialog.innerHTML = `
      <section class="exit-feedback">
        <button class="exit-feedback__close" type="button" aria-label="Close discount offer">&times;</button>
        <p class="exit-feedback__eyebrow">A quick question before you go</p>
        <h2 id="exit-feedback-title">Before You Go!</h2>
        <p class="exit-feedback__subheading">We'd love to know what you think.</p>
        <div class="exit-feedback__offer" aria-label="Get ${discountPercent} percent off">
          <span class="exit-feedback__percent"><span data-discount-percent>${discountPercent}</span>%</span>
          <span class="exit-feedback__offer-copy"><strong>GET <span data-discount-percent>${discountPercent}</span>% OFF</strong><span>Exclusive savings on your next project</span></span>
        </div>
        <p class="exit-feedback__intro" id="exit-feedback-description">Leave your email address to receive an exclusive discount promo code.</p>
        <form class="exit-feedback__form" novalidate>
          <div>
            <p class="exit-feedback__question" id="exit-feedback-question">What made you consider leaving?</p>
            <div class="exit-feedback__reasons" role="radiogroup" aria-labelledby="exit-feedback-question">
              ${[
                'Just browsing',
                'Services are too expensive',
                "Couldn't find what I needed",
                'Not ready to purchase',
                'Looking for other options',
                'Other'
              ].map(reason => `<label class="exit-feedback__reason"><input type="radio" name="reason" value="${reason}" required><span>${reason}</span></label>`).join('')}
            </div>
          </div>
          <div class="exit-feedback__other" hidden>
            <label class="exit-feedback__label" for="exit-feedback-other">Tell us a little more <span>(optional)</span></label>
            <input id="exit-feedback-other" name="comments" type="text" maxlength="500" autocomplete="off">
          </div>
          <div>
            <label class="exit-feedback__label" for="exit-feedback-email">Email address</label>
            <input id="exit-feedback-email" name="email" type="email" maxlength="254" autocomplete="email" placeholder="Enter your email address" required>
          </div>
          <label class="exit-feedback__consent" for="exit-feedback-consent"><input id="exit-feedback-consent" name="consent" type="checkbox"><span>I'd like to receive my discount code and promotional emails.</span></label>
          <p class="exit-feedback__consent-note">We'll email the requested code either way. Checking this records optional consent; this form won't send ongoing emails.</p>
          <div class="exit-feedback__trap" aria-hidden="true"><label for="exit-feedback-website">Leave this field empty</label><input id="exit-feedback-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
          <button class="exit-feedback__submit" type="submit">GET MY <span data-discount-percent>${discountPercent}</span>% DISCOUNT</button>
        </form>
        <p class="exit-feedback__status" role="status" aria-live="polite" tabindex="-1" hidden></p>
        <p class="exit-feedback__footer">No pressure. Your feedback helps us improve.</p>
      </section>`;
    document.body.append(dialog);

    form = dialog.querySelector('form');
    status = dialog.querySelector('.exit-feedback__status');
    submitButton = dialog.querySelector('.exit-feedback__submit');
    const otherInput = dialog.querySelector('#exit-feedback-other');

    dialog.querySelector('.exit-feedback__close').addEventListener('click', closePopup);
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
    dialog.querySelectorAll('input[name="reason"]').forEach(input => {
      input.addEventListener('change', () => {
        const showOther = input.checked && input.value === 'Other';
        if (showOther) {
          dialog.querySelector('.exit-feedback__other').hidden = false;
        } else if (input.checked) {
          dialog.querySelector('.exit-feedback__other').hidden = true;
          otherInput.value = '';
        }
      });
    });
    form.addEventListener('submit', submitFeedback);
  }

  function openPopup() {
    if (alreadyShown || !configReady || (!configAvailable && !debugMode)) return;
    if (!dialog) renderPopup();
    alreadyShown = true;
    markShown();
    returnFocus = document.activeElement;
    document.body.classList.add('exit-feedback-open');
    dialog.showModal();
    dialog.querySelector('#exit-feedback-email').focus();
  }

  function closePopup() {
    if (!dialog?.open) return;
    dialog.close();
    document.body.classList.remove('exit-feedback-open');
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
  }

  function showStatus(message, state = 'error') {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
    status.focus();
  }

  async function submitFeedback(event) {
    event.preventDefault();
    status.hidden = true;

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim();
    const reason = String(formData.get('reason') || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showStatus('Enter a valid email address to receive your discount code.');
      form.elements.email.focus();
      return;
    }
    if (!reason) {
      showStatus('Please select the reason that best describes your visit.');
      form.querySelector('input[name="reason"]').focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.textContent = 'SENDING…';
    try {
      const response = await fetch('/api/exit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          submissionId,
          email,
          reason,
          comments: String(formData.get('comments') || ''),
          consent: formData.get('consent') === 'on',
          website: String(formData.get('website') || ''),
          pageUrl: window.location.href,
          elapsedMs: Date.now() - startedAt
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === 'string' ? result.error : 'We couldn’t process your request. Please try again.');
      }
      form.hidden = true;
      showStatus('Thanks for your feedback! Your discount code has been sent to your email.', 'success');
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'We couldn’t process your request. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.textContent = `GET MY ${discountPercent}% DISCOUNT`;
    }
  }

  function canTrigger() {
    return !alreadyShown && configReady && (configAvailable || debugMode) && !dialog?.open;
  }

  function addExitIntentDetection() {
    if (debugMode) return;
    if (isMobile) {
      window.addEventListener('scroll', () => {
        const currentY = window.scrollY;
        if (currentY > 500) hasBrowsedDown = true;
        if (hasBrowsedDown && currentY < lastScrollY && currentY < 100 && canTrigger()) openPopup();
        lastScrollY = currentY;
      }, { passive: true });
      return;
    }

    document.addEventListener('mousemove', event => {
      const movingTowardTop = lastPointerY !== null && event.clientY < lastPointerY;
      if (Date.now() - startedAt > 1500 && movingTowardTop && lastPointerY > 35 && event.clientY <= 18 && canTrigger()) {
        openPopup();
      }
      lastPointerY = event.clientY;
    }, { passive: true });
  }

  async function loadConfig() {
    if (debugMode) return;
    if (hasBeenShown()) {
      alreadyShown = true;
      configReady = true;
      return;
    }
    try {
      const response = await fetch('/api/exit-feedback', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`Configuration request failed with status ${response.status}.`);
      const config = await response.json();
      configAvailable = config.enabled === true;
      configReady = true;
      if (!configAvailable) return;
      if (Number.isInteger(config.discountPercent) && config.discountPercent > 0) {
        discountPercent = config.discountPercent;
      }
    } catch (error) {
      console.error('Exit feedback popup is unavailable:', error);
      configReady = true;
      configAvailable = false;
    }
  }

  addExitIntentDetection();
  loadConfig();

  if (debugMode) {
    window.addEventListener('load', () => {
      window.setTimeout(openPopup, 250);
    }, { once: true });
  }
})();
