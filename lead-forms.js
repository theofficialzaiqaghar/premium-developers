(() => {
  const AVAILABLE_SERVICES = [
    'WordPress Development',
    'Elementor Development',
    'Divi Development',
    'WooCommerce Development',
    'Website Redesign',
    'Custom Development',
    'Custom WordPress Plugin Development',
    'Landing Pages',
    'Speed & Performance',
    'Maintenance & Support',
    'Essential Web',
    'Custom Apps',
    'Enterprise'
  ];

  const TIMELINES = [
    'ASAP',
    'Within 1 month',
    '1-3 months',
    '3-6 months',
    '6+ months',
    'Flexible / not sure yet'
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function serviceOptionsHtml(selected) {
    return AVAILABLE_SERVICES.map(
      (name) =>
        `<label><input type="checkbox" name="services" value="${escapeHtml(name)}"${
          name === selected ? ' checked' : ''
        }> ${escapeHtml(name)}</label>`
    ).join('');
  }

  function timelineOptionsHtml() {
    return TIMELINES.map(
      (value) => `<option value="${escapeHtml(value)}">${escapeHtml(value.replace('1-3', '1–3').replace('3-6', '3–6'))}</option>`
    ).join('');
  }

  function buildServiceFormMarkup(prefix, serviceName) {
    const id = (name) => `${prefix}-${name}`;
    return `
<form class="contact-form pd-lead-form" id="${id('form')}" action="/api/contact" method="post" novalidate data-form-name="service_inquiry">
  <input type="hidden" name="reason" value="Project discussion">
  <input type="hidden" name="sourcePage" value="">
  <input type="hidden" name="formName" value="service_inquiry">
  <p class="service-inquiry__service-tag"><strong>Service:</strong> ${escapeHtml(serviceName)}</p>
  <div class="contact-form__row">
    <div class="form-field">
      <label for="${id('name')}">Full name <span aria-hidden="true">*</span></label>
      <input id="${id('name')}" name="name" type="text" autocomplete="name" maxlength="100" required aria-describedby="${id('name')}-error">
      <span class="form-field__error" id="${id('name')}-error"></span>
    </div>
    <div class="form-field">
      <label for="${id('email')}">Email address <span aria-hidden="true">*</span></label>
      <input id="${id('email')}" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="${id('email')}-error">
      <span class="form-field__error" id="${id('email')}-error"></span>
    </div>
  </div>
  <div class="contact-form__row">
    <div class="form-field">
      <label for="${id('website')}">Website URL <span aria-hidden="true">*</span></label>
      <input id="${id('website')}" name="websiteUrl" type="url" inputmode="url" placeholder="https://example.com" maxlength="2048" required aria-describedby="${id('website')}-error">
      <span class="form-field__error" id="${id('website')}-error"></span>
    </div>
    <div class="form-field">
      <label for="${id('timeline')}">Preferred timeline <span aria-hidden="true">*</span></label>
      <select id="${id('timeline')}" name="projectTimeline" required aria-describedby="${id('timeline')}-error">
        <option value="" selected>Select a timeline</option>
        ${timelineOptionsHtml()}
      </select>
      <span class="form-field__error" id="${id('timeline')}-error"></span>
    </div>
  </div>
  <div class="contact-form__row">
    <div class="form-field">
      <label for="${id('phone')}">Phone <span class="form-field__optional">(optional)</span></label>
      <input id="${id('phone')}" name="phone" type="tel" autocomplete="tel" maxlength="40">
    </div>
    <div class="form-field">
      <label for="${id('company')}">Company <span class="form-field__optional">(optional)</span></label>
      <input id="${id('company')}" name="company" type="text" autocomplete="organization" maxlength="120">
    </div>
  </div>
  <div class="form-field">
    <label for="${id('message')}">Project details <span aria-hidden="true">*</span></label>
    <textarea id="${id('message')}" name="message" rows="4" maxlength="5000" required aria-describedby="${id('message')}-hint ${id('message')}-error"></textarea>
    <span class="form-field__hint" id="${id('message')}-hint">Goals, scope, and any reference links help us quote accurately.</span>
    <span class="form-field__error" id="${id('message')}-error"></span>
  </div>
  <fieldset class="contact-services pd-lead-form__services" hidden aria-hidden="true">
    <legend>Services</legend>
    <div class="contact-services__options">${serviceOptionsHtml(serviceName)}</div>
  </fieldset>
  <div class="contact-form__trap" aria-hidden="true">
    <label for="${id('hp')}">Leave this field empty</label>
    <input id="${id('hp')}" name="hp" type="text" tabindex="-1" autocomplete="off">
  </div>
  <p class="contact-form__privacy">Your details are used only to respond to your inquiry. <a href="/privacy-policy.html">Privacy policy</a></p>
  <p class="contact-form__status" id="${id('status')}" role="status" aria-live="polite" tabindex="-1" hidden></p>
  <button class="btn btn--primary contact-submit" type="submit">
    <span class="contact-submit__label">Request quote</span>
    <span class="contact-submit__loading" aria-hidden="true"></span>
  </button>
</form>
<section class="contact-success pd-lead-success" id="${id('success')}" tabindex="-1" hidden>
  <span class="contact-success__icon" aria-hidden="true">✓</span>
  <span class="contact-kicker">REQUEST RECEIVED</span>
  <h3>Thanks — we will review your project.</h3>
  <p>We aim to reply by email within two business days with practical next steps.</p>
</section>`;
  }

  function initLeadForm(form, options = {}) {
    if (!form || form.dataset.pdLeadBound === 'true') return;
    form.dataset.pdLeadBound = 'true';

    const track = window.pdTrack || (() => {});
    const trackOnce = window.pdTrackOnce || track;
    const formName = options.formName || form.dataset.formName || 'contact';
    const primaryService = options.primaryService || '';
    const success =
      options.successEl ||
      form.parentElement?.querySelector('.pd-lead-success, .contact-success') ||
      document.getElementById('contact-success');

    const submit = form.querySelector('button[type="submit"]');
    const submitLabel = form.querySelector('.contact-submit__label');
    const status = form.querySelector('.contact-form__status') || document.getElementById('contact-form-status');
    const reasonField = form.elements.namedItem('reason');
    const projectDetails = form.querySelector('#project-details');
    const servicesFieldset = form.querySelector('#contact-services, .pd-lead-form__services');
    const serviceOptions = servicesFieldset ? [...form.querySelectorAll('input[name="services"]')] : [];
    const servicesError = form.querySelector('#contact-services-error');
    const websiteOptionalLabel = form.querySelector('#contact-website-url-optional');
    const timelineOptionalLabel = form.querySelector('#contact-timeline-optional');
    const submitStartedAt = Date.now();
    let submitting = false;
    let formStartTracked = false;
    const trackLeadSuccess = window.pdTrackLeadSuccess || ((_, p, k) => {
      const trackO = window.pdTrackOnce || window.pdTrack || (() => {});
      trackO('generate_lead', p, k ? `generate_lead:${k}` : '');
    });
    const sourceInput = form.querySelector('input[name="sourcePage"]');
    if (sourceInput) sourceInput.value = window.location.pathname + window.location.search;

    const fields = ['name', 'email', 'message'];
    if (reasonField && reasonField.tagName === 'SELECT') fields.push('reason');

    function getField(name) {
      return form.elements.namedItem(name);
    }

    const websiteUrlField = getField('websiteUrl');
    const timelineField = getField('projectTimeline');

    if (reasonField && reasonField.tagName === 'SELECT') {
      const requestedReason = new URLSearchParams(window.location.search).get('reason');
      if (requestedReason) {
        const matchingOption = [...reasonField.options].find(
          (option) => option.value.toLowerCase() === requestedReason.toLowerCase()
        );
        if (matchingOption) reasonField.value = matchingOption.value;
      }
    }

    const setError = (field, message) => {
      if (!field) return;
      const error = document.getElementById(`${field.id}-error`);
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (error) error.textContent = message;
    };

    const setServicesError = (message) => {
      if (!servicesFieldset || !servicesError) return;
      servicesFieldset.setAttribute('aria-invalid', message ? 'true' : 'false');
      servicesError.textContent = message;
    };

    const isProjectDiscussion = () =>
      !reasonField || reasonField.value === 'Project discussion' || reasonField.type === 'hidden';

    const updateProjectDetails = () => {
      const project = isProjectDiscussion();
      if (projectDetails) projectDetails.hidden = !project;
      if (websiteOptionalLabel) {
        websiteOptionalLabel.textContent = project ? '(required for projects)' : '(optional)';
      }
      if (timelineOptionalLabel) {
        timelineOptionalLabel.textContent = project ? '(required for projects)' : '(optional)';
      }
      if (websiteUrlField) websiteUrlField.required = project;
      if (timelineField) timelineField.required = project;
      if (!project && serviceOptions.length) {
        serviceOptions.forEach((option) => {
          option.checked = false;
        });
        const promo = form.elements.namedItem('promoCode');
        if (promo) promo.value = '';
        setServicesError('');
        if (websiteUrlField) setError(websiteUrlField, '');
        if (timelineField) setError(timelineField, '');
      }
      if (project && primaryService && serviceOptions.length === 1) {
        serviceOptions[0].checked = true;
      }
    };

    const validateUrl = (field) => {
      const value = field.value.trim();
      if (!value) {
        if (isProjectDiscussion()) {
          setError(field, 'Enter your website URL (or the site you want built).');
          return false;
        }
        setError(field, '');
        return true;
      }
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
          setError(field, 'Enter a valid website URL starting with https:// or http://.');
          return false;
        }
      } catch {
        setError(field, 'Enter a valid website URL starting with https:// or http://.');
        return false;
      }
      setError(field, '');
      return true;
    };

    const validateTimeline = (field) => {
      const value = field.value.trim();
      if (!value) {
        if (isProjectDiscussion()) {
          setError(field, 'Choose a preferred project timeline.');
          return false;
        }
        setError(field, '');
        return true;
      }
      setError(field, '');
      return true;
    };

    const validate = (field) => {
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

    fields.forEach((name) => {
      const field = getField(name);
      if (!field) return;
      field.addEventListener('blur', () => {
        if (field.value.trim()) validate(field);
      });
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
        if (status) status.hidden = true;
      });
      field.addEventListener('change', () => {
        if (field.getAttribute('aria-invalid') === 'true') validate(field);
        if (status) status.hidden = true;
        if (field === reasonField) updateProjectDetails();
      });
    });

    websiteUrlField?.addEventListener('blur', () => validateUrl(websiteUrlField));
    websiteUrlField?.addEventListener('input', () => {
      if (websiteUrlField.getAttribute('aria-invalid') === 'true') validateUrl(websiteUrlField);
      if (status) status.hidden = true;
    });
    timelineField?.addEventListener('change', () => {
      if (timelineField.getAttribute('aria-invalid') === 'true') validateTimeline(timelineField);
      if (status) status.hidden = true;
    });

    serviceOptions.forEach((option) => {
      option.addEventListener('change', () => {
        if (serviceOptions.some((service) => service.checked)) setServicesError('');
        if (status) status.hidden = true;
      });
    });
    form.elements.namedItem('promoCode')?.addEventListener('input', () => {
      if (status) status.hidden = true;
    });

    updateProjectDetails();

    form.addEventListener(
      'focusin',
      () => {
        if (formStartTracked) return;
        formStartTracked = true;
        trackOnce(
          'form_start',
          {
            form_name: formName,
            form_id: form.id || '',
            source_page: cleanSource(form.querySelector('input[name="sourcePage"]')?.value || window.location.pathname)
          },
          `form_start:${formName}:${form.id || 'form'}`
        );
      },
      true
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      if (status) status.hidden = true;

      const invalidFields = fields.map((name) => getField(name)).filter((field) => field && !validate(field));

      if (websiteUrlField && !validateUrl(websiteUrlField)) invalidFields.push(websiteUrlField);
      if (timelineField && !validateTimeline(timelineField)) invalidFields.push(timelineField);

      if (invalidFields.length) {
        invalidFields[0].focus();
        return;
      }

      if (isProjectDiscussion() && serviceOptions.length && !serviceOptions.some((option) => option.checked)) {
        setServicesError('Select at least one service you’re interested in.');
        serviceOptions[0]?.focus();
        return;
      }

      submitting = true;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.classList.add('is-loading');
      if (submitLabel) submitLabel.textContent = 'Sending…';

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.services = formData.getAll('services');
      payload.elapsedMs = Date.now() - submitStartedAt;
      payload.formName = formName;
      payload.sourcePage = cleanSource(payload.sourcePage || window.location.pathname);

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
              if (name === 'services' && typeof message === 'string') {
                setServicesError(message);
                continue;
              }
              const field = getField(name);
              if (field && typeof message === 'string') setError(field, message);
            }
            const firstInvalid = [
              ...fields.map((name) => getField(name)),
              websiteUrlField,
              timelineField
            ].find((field) => field?.getAttribute('aria-invalid') === 'true');
            if (firstInvalid || servicesFieldset?.getAttribute('aria-invalid') === 'true') {
              if (status) {
                status.textContent =
                  'Please review the highlighted fields and try sending your message again.';
                status.hidden = false;
              }
              (firstInvalid || serviceOptions[0])?.focus();
              return;
            }
          }
          throw new Error('Unable to send your message right now.');
        }

        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }

        const selectedServices = formData.getAll('services');
        const conversionKey = `${formName}:${primaryService || selectedServices[0] || 'general'}`;
        trackLeadSuccess(
          {
            form_name: formName,
            form_id: form.id || '',
            form_destination: form.action || '/api/contact',
            inquiry_reason: payload.reason || 'Project discussion',
            service_name: primaryService || selectedServices[0] || '',
            services_selected: selectedServices.length ? selectedServices.join(', ') : '(none)',
            source_page: payload.sourcePage,
            has_promo_code: Boolean(String(payload.promoCode || '').trim())
          },
          conversionKey
        );
      } catch {
        if (status) {
          status.textContent =
            'We couldn’t send your message just now. Please try again, or email hello@premiumdevelopers.co.';
          status.hidden = false;
          status.focus();
        }
      } finally {
        submitting = false;
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.classList.remove('is-loading');
        if (submitLabel) submitLabel.textContent = options.submitLabel || 'Request quote';
      }
    });
  }

  function cleanSource(value) {
    const trimmed = String(value || '').trim().slice(0, 500);
    if (!trimmed.startsWith('/')) return trimmed.slice(0, 200);
    return trimmed;
  }

  function mountServiceInquiry(mountEl, serviceName) {
    if (!mountEl || !serviceName) return;
    const prefix = `lead-${serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}-${Math.random().toString(36).slice(2, 7)}`;
    mountEl.innerHTML = buildServiceFormMarkup(prefix, serviceName);
    const form = mountEl.querySelector('form');
    initLeadForm(form, {
      formName: 'service_inquiry',
      primaryService: serviceName,
      submitLabel: 'Request quote'
    });
  }

  function scrollContactFormIntoView() {
    const target =
      document.getElementById('contact-form') ||
      document.querySelector('.contact-form-card');
    if (!target) return;

    const nav = document.getElementById('nav');
    const offset = (nav?.offsetHeight || 76) + 20;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });

    window.setTimeout(() => {
      const focusable = target.querySelector(
        'input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, button'
      );
      if (focusable instanceof HTMLElement) {
        focusable.focus({ preventScroll: true });
      }
      target.classList.add('contact-form-card--focused');
      window.setTimeout(() => target.classList.remove('contact-form-card--focused'), 2400);
    }, 450);
  }

  function initContactPageForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const track = window.pdTrack || (() => {});
    const params = new URLSearchParams(window.location.search);
    const urlReason = params.get('reason');
    track('contact_page_view', { inquiry_reason: urlReason || '(not set)' });
    initLeadForm(form, { formName: 'contact', submitLabel: 'Send message' });

    const shouldScroll =
      window.location.hash === '#contact-form' || Boolean(urlReason);
    if (!shouldScroll) return;

    const runScroll = () => requestAnimationFrame(() => scrollContactFormIntoView());
    if (document.readyState === 'complete') {
      runScroll();
    } else {
      window.addEventListener('load', runScroll, { once: true });
    }
  }

  function buildHomeFormMarkup(prefix) {
    const id = (name) => `${prefix}-${name}`;
    const serviceOptions = AVAILABLE_SERVICES.map(
      (name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
    ).join('');
    return `
<form class="contact-form pd-lead-form pd-lead-form--home" id="${id('form')}" action="/api/contact" method="post" novalidate data-form-name="home_inquiry">
  <input type="hidden" name="reason" value="Project discussion">
  <input type="hidden" name="sourcePage" value="">
  <input type="hidden" name="formName" value="home_inquiry">
  <div class="contact-form__row">
    <div class="form-field">
      <label for="${id('service')}">Service interested in <span aria-hidden="true">*</span></label>
      <select id="${id('service')}" name="pdPrimaryService" required aria-describedby="${id('service')}-error">
        <option value="" selected disabled>Select a service</option>
        ${serviceOptions}
      </select>
      <span class="form-field__error" id="${id('service')}-error"></span>
    </div>
    <div class="form-field">
      <label for="${id('name')}">Full name <span aria-hidden="true">*</span></label>
      <input id="${id('name')}" name="name" type="text" autocomplete="name" maxlength="100" required aria-describedby="${id('name')}-error">
      <span class="form-field__error" id="${id('name')}-error"></span>
    </div>
  </div>
  <div class="contact-form__row">
    <div class="form-field">
      <label for="${id('email')}">Email <span aria-hidden="true">*</span></label>
      <input id="${id('email')}" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="${id('email')}-error">
      <span class="form-field__error" id="${id('email')}-error"></span>
    </div>
    <div class="form-field">
      <label for="${id('website')}">Website URL <span aria-hidden="true">*</span></label>
      <input id="${id('website')}" name="websiteUrl" type="url" placeholder="https://example.com" maxlength="2048" required aria-describedby="${id('website')}-error">
      <span class="form-field__error" id="${id('website')}-error"></span>
    </div>
  </div>
  <div class="form-field">
    <label for="${id('timeline')}">Timeline <span aria-hidden="true">*</span></label>
    <select id="${id('timeline')}" name="projectTimeline" required aria-describedby="${id('timeline')}-error">
      <option value="" selected>Select a timeline</option>
      ${timelineOptionsHtml()}
    </select>
    <span class="form-field__error" id="${id('timeline')}-error"></span>
  </div>
  <div class="form-field">
    <label for="${id('message')}">Project details <span aria-hidden="true">*</span></label>
    <textarea id="${id('message')}" name="message" rows="4" maxlength="5000" required aria-describedby="${id('message')}-error"></textarea>
    <span class="form-field__error" id="${id('message')}-error"></span>
  </div>
  <fieldset class="contact-services pd-lead-form__services" hidden aria-hidden="true">
    <legend>Services</legend>
    <div class="contact-services__options">${AVAILABLE_SERVICES.map((name) => `<label><input type="checkbox" name="services" value="${escapeHtml(name)}"> ${escapeHtml(name)}</label>`).join('')}</div>
  </fieldset>
  <div class="contact-form__trap" aria-hidden="true"><label for="${id('hp')}">Leave empty</label><input id="${id('hp')}" name="hp" type="text" tabindex="-1" autocomplete="off"></div>
  <p class="contact-form__status" id="${id('status')}" role="status" aria-live="polite" hidden></p>
  <button class="btn btn--primary contact-submit" type="submit"><span class="contact-submit__label">Get started</span></button>
</form>
<section class="contact-success pd-lead-success" id="${id('success')}" hidden tabindex="-1"><h3>Thanks — we received your inquiry.</h3><p>We aim to reply within two business days.</p></section>`;
  }

  function mountHomeInquiry(mountEl) {
    if (!mountEl) return;
    const prefix = `home-lead-${Math.random().toString(36).slice(2, 7)}`;
    mountEl.innerHTML = buildHomeFormMarkup(prefix);
    const form = mountEl.querySelector('form');
    const serviceSelect = form.querySelector('[name="pdPrimaryService"]');
    const syncService = () => {
      const value = serviceSelect.value;
      form.querySelectorAll('input[name="services"]').forEach((input) => {
        input.checked = input.value === value;
      });
    };
    serviceSelect.addEventListener('change', () => {
      syncService();
      if (serviceSelect.value) {
        serviceSelect.setAttribute('aria-invalid', 'false');
        const err = document.getElementById(`${serviceSelect.id}-error`);
        if (err) err.textContent = '';
      }
    });
    form.addEventListener(
      'submit',
      (event) => {
        syncService();
        if (!serviceSelect.value) {
          event.preventDefault();
          event.stopImmediatePropagation();
          serviceSelect.setAttribute('aria-invalid', 'true');
          const err = document.getElementById(`${serviceSelect.id}-error`);
          if (err) err.textContent = 'Select the service you are interested in.';
          serviceSelect.focus();
        }
      },
      { capture: true }
    );
    initLeadForm(form, { formName: 'home_inquiry', submitLabel: 'Get started' });
  }

  window.PDLeadForms = {
    AVAILABLE_SERVICES,
    initLeadForm,
    mountServiceInquiry,
    mountHomeInquiry,
    initContactPageForm,
    buildServiceFormMarkup
  };
})();
