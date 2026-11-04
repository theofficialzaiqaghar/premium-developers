/** Public-safe article shape — never expose non-published workflow content. */

function toPublicArticle(article) {
  if (!article || article.status !== 'published') return null;
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    seoTitle: article.seoTitle,
    metaDescription: article.metaDescription,
    excerpt: article.excerpt,
    primaryKeyword: article.primaryKeyword,
    secondaryKeywords: article.secondaryKeywords || [],
    searchIntent: article.searchIntent,
    categorySlugs: article.categorySlugs || [],
    tagSlugs: article.tagSlugs || [],
    featuredImage: article.featuredImage || { url: '', alt: '', filename: '' },
    bodyHtml: article.bodyHtml,
    internalLinks: article.internalLinks || [],
    externalLinks: article.externalLinks || [],
    author: article.author,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt
  };
}

function toPublicListItem(article) {
  const full = toPublicArticle(article);
  if (!full) return null;
  const { bodyHtml, ...rest } = full;
  return { ...rest, hasBody: Boolean(bodyHtml && bodyHtml.length) };
}

module.exports = { toPublicArticle, toPublicListItem };
