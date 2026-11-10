# SEO technical audit — Premium Developers

**Date:** 2026-11-11  
**Context:** Google Search Console shows impressions with weak average positions (e.g. “woocommerce developer” ~pos 93, “elementor developer” ~87). Homepage gets clicks; service and blog URLs are visible but not page-one yet.

## What we verified

| Item | Status |
|------|--------|
| **www preferred** | `vercel.json`: apex `premiumdevelopers.co` → `https://www.premiumdevelopers.co/:path*` (301) |
| **Canonicals** | Core pages use `https://www.premiumdevelopers.co/...` |
| **Home canonical** | `https://www.premiumdevelopers.co/` |
| **Sitemap** | `sitemap.xml`, `sitemap-blog.xml`; build via `npm run sitemap:build` |
| **robots.txt** | Allows `/`, blocks `/admin/`, lists sitemaps |
| **Duplicate home** | `/index.html` → `/` (301) added |

## Fixes applied in repo

1. **Breadcrumbs (HTML):** `../index.html` → `/`, `../services.html` → `/services.html` (`scripts/patch-seo-fixes.js`).
2. **Organization `sameAs`:** Injected on service/case-study pages missing it (LinkedIn, Instagram, Contra, Upwork, Facebook).
3. **Blog Article schema:** `BlogPosting` + `BreadcrumbList` on all static posts (`build-static-blog.js`).
4. **OG images:** WooCommerce, Elementor, WordPress service pages use real service hero images (not generic OG).
5. **Performance:** Asset cache headers on Vercel; blog Google Fonts non-blocking; removed unused Unsplash preconnect on WooCommerce service page.
6. **Social / founder:** `sameAs` on home and about (prior work).

## Why positions are still weak (not only “technical SEO”)

GSC impressions at positions 80–110 usually mean:

- **Domain authority / backlinks** still building vs established agencies.
- **Query match:** Competitors have more reviews, locality pages, and long-tail landing pages.
- **Time:** New or lightly linked URLs need crawl, internal PR, and external mentions to move.
- **SERP features:** UK/US “hire developer” queries mix marketplaces (Upwork), directories, and large agencies.

Technical fixes help Google **trust and index** the right URL; they do not replace **content depth, proof, and links**.

## Priority actions after deploy

### GSC

1. URL Inspection → **Request indexing** for:
   - `/services/woocommerce-development.html`
   - `/services/elementor-development.html`
   - `/blog/woocommerce-developer-uk/`
   - `/blog/woocommerce-website-development-guide/`
2. Monitor **Pages** → filter queries containing `woocommerce developer`, `elementor developer`.
3. Export **404** list monthly; add redirects in `vercel.json` as needed.

### Content & conversion (ranking + leads)

1. **Internal links:** From high-impression blog posts → WooCommerce service with anchor “WooCommerce developer UK”.
2. **Proof:** Case studies with measurable outcomes linked from service pages.
3. **UK + US signals:** Keep pricing/currency clarity; GBP and USD examples where honest.
4. **Marketplace consistency:** Upwork/Contra profiles link to matching service URLs (already on site footers).

### Performance (measure, then tune)

1. Run Lighthouse on **home**, **WooCommerce service**, one **blog post** (mobile).
2. Watch **LCP** (hero image/video on home), **INP** (GTM + popups after consent).
3. Consider WebP heroes for service pages when quality allows (PNG today for brand art).

## Commands

```bash
npm run sitemap:build
npm run blog:build-static
node scripts/patch-seo-fixes.js
npm run site:patch-socials
```

## Hostname check (manual)

After deploy:

```bash
curl -sI https://premiumdevelopers.co/services/woocommerce-development.html | findstr /i location
curl -sI https://www.premiumdevelopers.co/ | findstr /i "200\|301"
```

Expect apex → `www` and final **200** on canonical URL.
