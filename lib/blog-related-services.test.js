const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pickRelatedServices, renderRelatedServicesSection } = require('./blog-related-services');

test('pickRelatedServices prefers WooCommerce for woocommerce articles', () => {
  const post = {
    categorySlugs: ['woocommerce'],
    tagSlugs: ['ecommerce']
  };
  const urls = pickRelatedServices(post, 3).map((s) => s.href);
  assert.ok(urls[0].includes('woocommerce-development'));
});

test('renderRelatedServicesSection outputs heading and three cards', () => {
  const html = renderRelatedServicesSection({ categorySlugs: ['wordpress'], tagSlugs: [] });
  assert.match(html, /Related services/);
  assert.equal((html.match(/class="blog-related-service"/g) || []).length, 3);
});
