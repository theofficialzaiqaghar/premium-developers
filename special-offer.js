(() => {
  const form = document.querySelector('#special-offer-form');
  if (!form) return;

  const track = window.pdTrack || (() => {});
  track('special_offer_page_view', { offer_type: '50_percent_off' });

  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = form.querySelector('.offer-form__submit-label');
  const status = document.querySelector('#offer-form-status');
  const success = document.querySelector('#offer-success');
  const servicesFieldset = document.querySelector('#offer-services');
  const serviceOptions = [...form.querySelectorAll('input[name="services"]')];
  const startedAt = Date.now();
  let submissionId = createSubmissionId();
  let submitting = false;

  const getField = name => form.elements.namedItem(name);

  function createSubmissionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function setError(field, message) {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
  }

  function setServicesError(message) {
    servicesFieldset.setAttribute('aria-invalid', message ? 'true' : 'false');
    document.querySelector('#offer-services-error').textContent = message;
  }

  function setStatus(message) {
    status.textContent = message;
    status.hidden = !message;
  }

  function validateField(field) {
    const value = field.value.trim();
    let message = '';
    if (!value) {
      message = 'Please complete this field.';
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = 'Enter a valid business email address.';
    } else if (field.type === 'url') {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
          message = 'Enter a valid website URL starting with https:// or http://.';
        }
      } catch {
        message = 'Enter a valid website URL starting with https:// or http://.';
      }
    } else if (field.name === 'fullName' && value.length < 2) {
      message = 'Enter your full name (at least 2 characters).';
    } else if (field.name === 'projectDetails' && value.length < 10) {
      message = 'Tell us a little more about your project (at least 10 characters).';
    }
    setError(field, message);
    return !message;
  }

  const requiredFields = ['fullName', 'email', 'websiteUrl', 'projectDetails'].map(getField);
  requiredFields.forEach(field => {
    field.addEventListener('blur', () => {
      if (field.value.trim()) validateField(field);
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      setStatus('');
    });
    field.addEventListener('change', () => setStatus(''));
  });

  serviceOptions.forEach(option => {
    option.addEventListener('change', () => {
      if (serviceOptions.some(service => service.checked)) setServicesError('');
      setStatus('');
    });
  });

  getField('consent').addEventListener('change', () => {
    const field = getField('consent');
    field.setAttribute('aria-invalid', field.checked ? 'false' : 'true');
    document.querySelector('#offer-consent-error').textContent = field.checked
      ? ''
      : 'Consent is required so we can respond to your inquiry.';
    setStatus('');
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    setStatus('');

    const invalidFields = requiredFields.filter(field => !validateField(field));
    if (!serviceOptions.some(option => option.checked)) {
      setServicesError('Select at least one service you’re interested in.');
    }
    const consentField = getField('consent');
    consentField.setAttribute('aria-invalid', consentField.checked ? 'false' : 'true');
    document.querySelector('#offer-consent-error').textContent = consentField.checked
      ? ''
      : 'Consent is required so we can respond to your inquiry.';

    if (invalidFields.length || !serviceOptions.some(option => option.checked) || !consentField.checked) {
      const firstInvalid = invalidFields[0];
      if (firstInvalid) firstInvalid.focus();
      else if (!serviceOptions.some(option => option.checked)) serviceOptions[0].focus();
      else consentField.focus();
      return;
    }

    submitting = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.classList.add('is-loading');
    submitLabel.textContent = 'Sending…';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.services = formData.getAll('services');
    payload.consent = getField('consent').checked;
    payload.elapsedMs = Date.now() - startedAt;
    payload.submissionId = submissionId;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok !== true) {
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            if (name === 'services' && typeof message === 'string') {
              setServicesError(message);
              continue;
            }
            if (name === 'consent' && typeof message === 'string') {
              document.querySelector('#offer-consent-error').textContent = message;
              consentField.setAttribute('aria-invalid', 'true');
              continue;
            }
            const field = getField(name);
            if (field && typeof message === 'string') setError(field, message);
          }
        }
        if (result.leadStored === true) {
          throw new Error('Your inquiry was saved, but email notifications could not be sent right now. Please try again shortly.');
        }
        throw new Error(typeof result.error === 'string'
          ? result.error
          : 'We couldn’t send your inquiry right now. Please try again.');
      }

      form.hidden = true;
      success.hidden = false;
      success.focus();

      track('generate_lead', {
        form_name: 'special_offer',
        services_selected: payload.services.join(', '),
        offer_type: '50_percent_off',
        marketing_consent: payload.consent === true
      });
    } catch (error) {
      setStatus(error instanceof Error
        ? error.message
        : 'We couldn’t send your inquiry right now. Please try again.');
      status.focus();
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.classList.remove('is-loading');
      submitLabel.textContent = 'Claim My 50% OFF';
    }
  });
})();
