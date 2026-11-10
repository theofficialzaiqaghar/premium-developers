const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAnalytics() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'analytics.js'), 'utf8');
  const context = {
    window: {
      dataLayer: [],
      __pdTrackedEvents: new Set(),
      location: { pathname: '/test', href: 'https://www.premiumdevelopers.co/test' }
    },
    document: {}
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window;
}

test('pdTrackOnce fires at most once per dedupe key', () => {
  const win = loadAnalytics();
  win.pdTrackOnce('generate_lead', { form_name: 'contact' }, 'generate_lead:contact:general');
  win.pdTrackOnce('generate_lead', { form_name: 'contact' }, 'generate_lead:contact:general');
  const events = win.dataLayer.filter((e) => e.event === 'generate_lead');
  assert.equal(events.length, 1);
});

test('pdTrackLeadSuccess pushes generate_lead and form_submit once', () => {
  const win = loadAnalytics();
  win.pdTrackLeadSuccess({ form_name: 'contact', service_name: 'WordPress Development' }, 'contact:wp');
  const names = win.dataLayer.map((e) => e.event);
  assert.equal(names.filter((n) => n === 'generate_lead').length, 1);
  assert.equal(names.filter((n) => n === 'form_submit').length, 1);
  win.pdTrackLeadSuccess({ form_name: 'contact', service_name: 'WordPress Development' }, 'contact:wp');
  assert.equal(win.dataLayer.filter((e) => e.event === 'form_submit').length, 1);
});

test('pdTrack allows repeated events without dedupe key', () => {
  const win = loadAnalytics();
  win.pdTrack('cta_click', { cta_text: 'a' });
  win.pdTrack('cta_click', { cta_text: 'b' });
  const events = win.dataLayer.filter((e) => e.event === 'cta_click');
  assert.equal(events.length, 2);
});

test('tracking snippets include consent before GTM', () => {
  const { gtmHead } = require('./tracking-snippets');
  const head = gtmHead();
  assert.match(head, /consent-default\.js/);
  assert.match(head, /GTM-WF285DKZ/);
  assert.ok(head.indexOf('consent-default') < head.indexOf('GTM-WF285DKZ'));
});

test('tracking snippets include AdSense after GTM once', () => {
  const { gtmHead } = require('./tracking-snippets');
  const head = gtmHead();
  assert.match(head, /adsbygoogle\.js\?client=ca-pub-7106840681244658/);
  assert.equal((head.match(/adsbygoogle\.js/g) || []).length, 1);
  assert.ok(head.indexOf('GTM-WF285DKZ') < head.indexOf('adsbygoogle'));
});
