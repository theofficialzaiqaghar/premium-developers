/**
 * Shared JSON-LD fragments for Organization, articles, and breadcrumbs.
 */
const { ORGANIZATION_SAME_AS, FOUNDER_PERSON_ID, FOUNDER_LINKEDIN } = require('./social-profiles');

const SITE = 'https://www.premiumdevelopers.co';
const ORG_ID = `${SITE}/#organization`;
const WEBSITE_ID = `${SITE}/#website`;

function organizationSameAsBlockJson(indent = '      ') {
  const lines = ORGANIZATION_SAME_AS.map((u) => `${indent}        ${JSON.stringify(u)}`).join(',\n');
  return `${indent}"sameAs": [\n${lines}\n${indent}      ],\n`;
}

function buildBlogPostingGraph(post, canonical) {
  const image = canonical.startsWith('http')
    ? post.imageUrl
    : `${SITE}${post.imageUrl || '/assets/images/og/premium-developers-og.jpg'}`;
  const headline = post.title;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: 'Premium Developers',
        url: SITE,
        sameAs: ORGANIZATION_SAME_AS
      },
      {
        '@type': 'Person',
        '@id': FOUNDER_PERSON_ID,
        name: 'Muhammad Saad Ullah Khan',
        url: FOUNDER_LINKEDIN
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE,
        name: 'Premium Developers',
        publisher: { '@id': ORG_ID }
      },
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline,
        description: post.metaDescription || post.excerpt || headline,
        image,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: { '@id': FOUNDER_PERSON_ID },
        publisher: { '@id': ORG_ID },
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        isPartOf: { '@id': WEBSITE_ID },
        inLanguage: 'en'
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE}/`
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Blog',
            item: `${SITE}/blog/`
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: headline,
            item: canonical
          }
        ]
      }
    ]
  };
}

module.exports = {
  SITE,
  ORG_ID,
  organizationSameAsBlockJson,
  buildBlogPostingGraph,
  ORGANIZATION_SAME_AS
};
