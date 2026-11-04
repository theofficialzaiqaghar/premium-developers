#!/usr/bin/env node
/**
 * Builds content/blog-seo-pack/seo-pack-10-draft.backup.json from manifest + HTML bodies.
 * Import in admin: /admin/blog/ → Backup → Import (onSlugConflict: skip).
 */
const fs = require('node:fs');
const path = require('node:path');
const { normalizeArticle } = require('../lib/blog/_lib/validate');
const { SCHEMA_VERSION } = require('../lib/blog/_lib/constants');
const taxonomy = require('../content/blog-seo-pack/categories-tags');

const packDir = path.join(__dirname, '..', 'content', 'blog-seo-pack');
const manifest = JSON.parse(fs.readFileSync(path.join(packDir, 'manifest.json'), 'utf8'));
const now = new Date().toISOString();

const articles = manifest.map((entry) => {
  const bodyPath = path.join(packDir, 'bodies', entry.bodyFile);
  const bodyHtml = fs.readFileSync(bodyPath, 'utf8').trim();
  const excerpt = entry.metaDescription.slice(0, 320);
  const record = normalizeArticle({
    id: entry.id,
    slug: entry.slug,
    status: 'draft',
    qualityStatus: 'pass',
    title: entry.title,
    seoTitle: entry.seoTitle,
    metaDescription: entry.metaDescription,
    excerpt,
    primaryKeyword: entry.primaryKeyword,
    secondaryKeywords: entry.secondaryKeywords,
    searchIntent: 'commercial',
    categorySlugs: entry.categorySlugs,
    tagSlugs: entry.tagSlugs,
    featuredImage: entry.featuredImage,
    bodyHtml,
    internalLinks: entry.internalLinks,
    externalLinks: [],
    researchSummary: `SEO pack article (priority ${entry.publishPriority}). Focus: ${entry.primaryKeyword}.`,
    author: 'Premium Developers',
    revision: 1,
    createdAt: now,
    updatedAt: now
  });
  return record;
});

const backup = {
  generator: 'premium-developers-blog-cms',
  schemaVersion: SCHEMA_VERSION,
  exportedAt: now,
  counts: {
    articles: articles.length,
    categories: taxonomy.categories.length,
    tags: taxonomy.tags.length
  },
  articles,
  categories: taxonomy.categories.map((c) => ({ ...c, createdAt: now, updatedAt: now })),
  tags: taxonomy.tags.map((t) => ({ ...t, createdAt: now, updatedAt: now })),
  notes: {
    status: 'All articles are draft — publish manually from admin in recommended priority order.',
    publishPriority: manifest
      .slice()
      .sort((a, b) => a.publishPriority - b.publishPriority)
      .map((e) => ({ priority: e.publishPriority, slug: e.slug, title: entryTitle(e) }))
  }
};

function entryTitle(e) {
  return e.title;
}

const outPath = path.join(packDir, 'seo-pack-10-draft.backup.json');
fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');
console.log(`Wrote ${articles.length} draft articles → ${outPath}`);
