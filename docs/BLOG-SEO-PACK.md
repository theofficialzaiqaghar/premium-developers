# SEO blog pack — 10 draft articles

## Files

| Path | Purpose |
| --- | --- |
| `content/blog-seo-pack/manifest.json` | Titles, SEO fields, slugs, keywords, images, links |
| `content/blog-seo-pack/bodies/*.html` | Article HTML (sanitized on import) |
| `content/blog-seo-pack/seo-pack-10-draft.backup.json` | **Import this** into the blog CMS |
| `scripts/build-blog-seo-pack-backup.js` | Regenerate backup after editing bodies/manifest |

## Import steps (production or local)

1. Deploy code that includes this backup file (or copy JSON to your machine).
2. Open **https://www.premiumdevelopers.co/admin/blog/** and sign in.
3. **Categories / tags:** Create once (or match slugs in backup):
   - Categories: `woocommerce`, `wordpress`, `web-design`, `guides`
   - Tags: `woocommerce`, `wordpress`, `elementor`, `ecommerce`, `roofing`, `performance`, `small-business`, `web-design`
4. **Backup → Import** → upload `seo-pack-10-draft.backup.json` → use **skip** on slug conflict if re-importing.
5. Review each article in admin (preview), adjust if needed.
6. **Publish manually** in this order (recommended):

| Priority | Slug |
| --- | --- |
| 1 | `roofing-website-design-features` |
| 2 | `woocommerce-website-development-cost` |
| 3 | `hire-woocommerce-developer` |
| 4 | `wordpress-website-redesign-signs` |
| 5 | `elementor-website-development-guide` |
| 6 | `custom-woocommerce-development` |
| 7 | `small-business-website-design-guide` |
| 8 | `woocommerce-checkout-optimization` |
| 9 | `speed-up-wordpress-website` |
| 10 | `woocommerce-vs-shopify` |

## CMS fields populated

- Blog title → `title`
- SEO title → `seoTitle`
- Meta description → `metaDescription` + `excerpt`
- Focus keyword → `primaryKeyword`
- Secondary keywords → `secondaryKeywords`
- Body → `bodyHtml`
- Slug → `slug`
- Categories / tags → `categorySlugs`, `tagSlugs`
- Featured image → `featuredImage` (Unsplash URL + alt)
- Internal links → `internalLinks` (service pages + cross-links)
- Status → **`draft`** (no auto-publish)

## SEO note

Focus keywords appear naturally in the intro and headings—not stuffed. Expand body copy in admin before publish if you want longer pillar content.

## Rebuild after edits

```bash
node scripts/build-blog-seo-pack-backup.js
```
