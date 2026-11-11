const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

test('blog index loads consent before GTM and includes cookie UI', () => {
  const html = fs.readFileSync(path.join(root, 'blog', 'index.html'), 'utf8');
  const consentIdx = html.indexOf('consent-default.js');
  const gtmIdx = html.indexOf('GTM-WF285DKZ');
  const adsenseIdx = html.indexOf('adsbygoogle.js');
  assert.ok(consentIdx > 0, 'missing consent-default.js');
  assert.ok(consentIdx < gtmIdx, 'consent must precede GTM');
  assert.ok(gtmIdx < adsenseIdx, 'GTM should precede AdSense loader');
  assert.match(html, /cookie-consent\.css/);
  assert.match(html, /cookie-consent\.js/);
  assert.match(html, /data-pd-open-cookie-settings/);
  assert.equal((html.match(/consent-default\.js/g) || []).length, 1);
  assert.equal((html.match(/cookie-consent\.js/g) || []).length, 1);
});

test('build-static-blog preserves blog archive tracking integration', () => {
  const { ensureBlogArchiveTracking } = require('./blog-archive-tracking');
  let html = `<!DOCTYPE html><html><head>
<!-- Google Tag Manager -->
<script>GTM-WF285DKZ</script>
<!-- End Google Tag Manager -->
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7106840681244658"></script>
<!-- End Google AdSense -->
<meta charset="UTF-8">
<link rel="stylesheet" href="/whatsapp-button.css">
</head><body class="x">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WF285DKZ"></iframe></noscript>
<footer><a href="/terms-and-conditions.html">Terms</a></span>
<script src="/analytics.js"></script>
</body></html>`;
  html = ensureBlogArchiveTracking(html);
  assert.match(html, /consent-default\.js/);
  assert.match(html, /cookie-consent\.js/);
  assert.match(html, /data-pd-open-cookie-settings/);
});

test('applyConsent maps Accept and Reject to Consent Mode v2 storage types', () => {
  function payload(choice) {
    return {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_storage: choice.marketing ? 'granted' : 'denied',
      ad_user_data: choice.marketing ? 'granted' : 'denied',
      ad_personalization: choice.marketing ? 'granted' : 'denied'
    };
  }
  assert.deepEqual(payload({ analytics: true, marketing: true }), {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
  assert.deepEqual(payload({ analytics: false, marketing: false }), {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  assert.deepEqual(payload({ analytics: true, marketing: false }), {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
});

test('PDOpenCookieSettings denies Consent Mode v2 before reopening banner', () => {
  const consentUpdates = [];
  const dataLayer = [];
  const storage = { store: {} };
  const localStorage = {
    getItem(key) {
      return storage.store[key] ?? null;
    },
    setItem(key, value) {
      storage.store[key] = value;
    },
    removeItem(key) {
      delete storage.store[key];
    }
  };

  const banner = {
    id: 'pd-cookie-banner',
    hidden: true,
    querySelector(sel) {
      const stub = { hidden: false, checked: false, addEventListener() {} };
      if (sel === '#pd-cookie-settings') return { ...stub, hidden: false };
      if (sel === '#pd-consent-save') return { ...stub, hidden: false };
      if (sel === '#pd-consent-analytics') return { ...stub, checked: true };
      if (sel === '#pd-consent-marketing') return { ...stub, checked: false };
      if (sel?.startsWith('[data-pd-consent=')) return stub;
      return null;
    },
    set hidden(value) {
      this._hidden = value;
    },
    get hidden() {
      return this._hidden;
    }
  };

  const document = {
    getElementById(id) {
      return id === 'pd-cookie-banner' ? banner : null;
    },
    createElement() {
      return banner;
    },
    body: { appendChild() {} },
    readyState: 'complete',
    addEventListener() {}
  };

  const sandbox = {
    dataLayer,
    localStorage,
    document,
    gtag(...args) {
      if (args[0] === 'consent' && args[1] === 'update') {
        consentUpdates.push(args[2]);
      }
      dataLayer.push(args);
    }
  };
  sandbox.window = sandbox;

  storage.store.pd_cookie_consent_v1 = JSON.stringify({ analytics: true, marketing: true });

  const code = fs.readFileSync(path.join(root, 'cookie-consent.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  assert.equal(consentUpdates.length, 0);
  sandbox.PDOpenCookieSettings();

  assert.equal(consentUpdates.length, 1);
  const denied = consentUpdates[0];
  assert.equal(denied.analytics_storage, 'denied');
  assert.equal(denied.ad_storage, 'denied');
  assert.equal(denied.ad_user_data, 'denied');
  assert.equal(denied.ad_personalization, 'denied');
  assert.equal(localStorage.getItem('pd_cookie_consent_v1'), null);
  assert.equal(banner.hidden, false);
});
