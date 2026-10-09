(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = form.querySelector('.contact-submit__label');
  const status = document.querySelector('#contact-form-status');
  const success = document.querySelector('#contact-success');
  const fields = ['name', 'email', 'reason', 'message'];
  const submitStartedAt = Date.now();

  const getField = name => form.elements.namedItem(name);
  const requestedReason = new URLSearchParams(window.location.search).get('reason');
  if (requestedReason) {
    const reasonField = getField('reason');
    const matchingOption = [...reasonField.options].find(option =>
      option.value.toLowerCase() === requestedReason.toLowerCase()
    );
    if (matchingOption) reasonField.value = matchingOption.value;
  }

  const setError = (field, message) => {
    const error = document.querySelector(`#${field.id}-error`);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) error.textContent = message;
  };

  const validate = field => {
    const value = field.value.trim();
    let message = '';

    if (!value) {
      message = 'Please complete this field.';
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = 'Enter a valid email address so we can reply.';
    } else if (field.name === 'name' && value.length < 2) {
      message = 'Enter your name (at least 2 characters).';
    } else if (field.name === 'message' && value.length < 10) {
      message = 'Please add a little more detail (at least 10 characters).';
    }

    setError(field, message);
    return !message;
  };

  fields.forEach(name => {
    const field = getField(name);
    field.addEventListener('blur', () => {
      if (field.value.trim()) validate(field);
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
      status.hidden = true;
    });
    field.addEventListener('change', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
      status.hidden = true;
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    status.hidden = true;

    const invalidFields = fields
      .map(name => getField(name))
      .filter(field => !validate(field));

    if (invalidFields.length) {
      invalidFields[0].focus();
      return;
    }

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.classList.add('is-loading');
    submitLabel.textContent = 'Sending…';

    const payload = Object.fromEntries(new FormData(form).entries());
    payload.elapsedMs = Date.now() - submitStartedAt;

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.fieldErrors && typeof result.fieldErrors === 'object') {
          for (const [name, message] of Object.entries(result.fieldErrors)) {
            const field = getField(name);
            if (field && typeof message === 'string') setError(field, message);
          }
          const firstInvalid = fields.map(name => getField(name))
            .find(field => field.getAttribute('aria-invalid') === 'true');
          if (firstInvalid) {
            status.textContent = 'Please review the highlighted fields and try sending your message again.';
            status.hidden = false;
            firstInvalid.focus();
            return;
          }
        }
        throw new Error('Unable to send your message right now.');
      }

      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch {
      status.textContent = 'We couldn’t send your message just now. Your details are still here—please try again, or email us directly at hello@premiumdevelopers.co.';
      status.hidden = false;
      status.focus();
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.classList.remove('is-loading');
      submitLabel.textContent = 'Send message';
    }
  });
})();
