# Pre-implementation baseline (preserve before edits)

**Captured:** 20 Nov 2026  
**Rule:** Local SEO changes only after this snapshot. **No deploy** until explicit approval.

## Current live/canonical host

- Primary: `https://premiumdevelopers.co` (www → apex 308 already live)

## Money-page SEO before changes

| URL | Title | Meta (abbrev) | H1 |
|-----|-------|---------------|-----|
| `/services/woocommerce-development.html` | WooCommerce Developer UK \| Stores, Checkout & Payments | Hire a WooCommerce developer UK for catalogues… | WooCommerce developer UK for stores that sell properly |
| `/blog/woocommerce-website-development-guide/` | WooCommerce Website Development: Features UK Stores Need \| … Blog | Practical checklist… | WooCommerce website development: features every UK store needs |
| `/services/wordpress-development.html` | WordPress Developer UK \| Custom Sites & Redesigns | Hire a WordPress developer in the UK… | WordPress developer UK for business websites that convert |
| `/services/elementor-development.html` | Elementor Developer \| WordPress Page Builds \| Premium Developers | Hire an Elementor developer… | Elementor developer for WordPress website builds |
| `/divi-development/` (file: services/divi-development.html) | Divi Developer UK \| Custom Divi Website Design \| Premium Developers | Need a professional Divi developer?… | Custom Divi Website Development for Growing Businesses |
| `/services/maintenance-support.html` | WordPress Maintenance & Support \| Premium Developers | Ongoing WordPress maintenance… | Keep your website cared for and moving forward. |

## Cannibalization finding (pre-fix)

GSC maps `woocommerce developer` to **both**:

- Money: `/services/woocommerce-development.html`
- Blog: `/blog/woocommerce-website-development-guide/`

Blog also uses hire-intent anchor: “Hire a WooCommerce developer UK” → service URL.

## Tracking finding (pre-fix)

| Item | Status |
|------|--------|
| `analytics.js` `generate_lead` / `form_submit` | Already implemented |
| WhatsApp / tel / service `cta_click` | Already implemented |
| GA4 organic key events | **0** in reporting — GTM→GA4 key-event config likely incomplete |
| Nav “Book a Consultation” → `/contact` | No dedicated `consultation_click` event |

## Files to touch (planned)

- `services/woocommerce-development.html`
- `blog/woocommerce-website-development-guide/index.html` (+ manifest/card sync)
- `services/wordpress-development.html`
- `services/elementor-development.html`
- `services/divi-development.html`
- `services/maintenance-support.html`
- `analytics.js` (+ test)
- `seo-reports/implementation-notes.md` (GTM/GSC manual steps)
- Selected internal links from high-impr blogs → money pages

## GSC URL Inspection snapshot (apex, 20 Nov 2026)

| URL | Result |
|-----|--------|
| `/services/woocommerce-development.html` | Indexed |
| `/services/wordpress-development.html` | Indexed (declared canonical still showed www in Oct crawl cache) |
| `/services/elementor-development.html` | Crawled – not indexed |
| `/services/maintenance-support.html` | Indexed |
| `/blog/woocommerce-website-development-guide/` | Crawled – not indexed |
| `/` | Duplicate — Google chose www over declared apex |

## Rollback

Revert the git commit/diff for the above paths. Live site unchanged until approved deploy.
