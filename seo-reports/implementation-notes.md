# Implementation notes — Phase 1 on-page (local, not deployed)

**Date:** 20 Nov 2026  
**Status:** Code changes ready for review. **Do not deploy until approval.**

## Baseline preserved

See `pre-implementation-baseline.md`.

## What changed (local)

### 1. WooCommerce cannibalization
- **Money page** owns hire intent (`woocommerce developer`).
- **Blog guide** retargeted to checklist/educational intent (title, H1, meta, JSON-LD, body CTA, related-service label).
- Manifest + blog index card synced.
- Pricing note clarifies: checklist = educational; hire = this service page.

### 2. Titles / metas / H1s
| Page | New title focus |
|------|-----------------|
| WooCommerce service | WooCommerce Developer \| UK & US Store Builds |
| WordPress service | WordPress Developer UK \| Business Websites & Agency |
| Elementor service | Elementor Developer \| WordPress Builds You Can Edit |
| Divi service | Divi Development Agency UK \| Custom Divi Websites |
| Maintenance | WordPress Maintenance Packages \| Updates & Support |
| Woo vs Shopify blog | Shorter title (removed long Blog suffix) |
| Speed blog | Shorter practical-guide title |

### 3. GA4 / tracking (code)
- Added `consultation_click` (+ `cta_click`) for nav `/contact` CTAs in `analytics.js`.
- Existing `generate_lead` / `form_submit` unchanged (already correct).
- Docs updated in `docs/GOOGLE-ADS-READINESS.md`.
- Unit test added in `lib/tracking.test.js`.

### 4. Proof / internal linking
- Woo service portfolio: added US **Lynx Med Spa** case study card + case-studies hub link.
- Softened hire anchors on Woo guide + Woo vs Shopify related cards.

## Indexing status (GSC inspect — before deploy)

| URL | Status |
|-----|--------|
| WooCommerce service (apex) | Indexed |
| WordPress service (apex) | Indexed (stale www declared in last crawl Oct 10 — will refresh after deploy) |
| Elementor service | **Crawled – currently not indexed** → Request indexing after deploy |
| Maintenance | Indexed |
| Woo guide blog | **Crawled – currently not indexed** |
| Homepage | Google still prefers **www** canonical in last crawl — apex redirect should correct over time; re-inspect after deploy |

### Manual GSC steps after approved deploy
1. Open each apex money URL in [URL Inspection](https://search.google.com/search-console).
2. Click **Request indexing** for: Woo, WP, Elementor, Divi, Maintenance, Contact, Home (apex).
3. Monitor Coverage / Page indexing for www→apex consolidation (2–4 weeks).

## Manual GTM / GA4 key events (required for KPI — not in repo)

Per `docs/GOOGLE-ADS-READINESS.md`:

1. GTM: Custom Event trigger `generate_lead` → GA4 Event tag `generate_lead` → **Publish**.
2. Optional: Custom Event `form_submit` where `lead_outcome` = `success`.
3. Optional: Custom Event `consultation_click` → GA4 Event (micro).
4. GA4 Admin → Events → mark **`generate_lead` as Key event**.
5. Verify in DebugView with a test contact submit on production after deploy.

Without steps 1–4, organic key events stay at **0** even if the site pushes dataLayer correctly.

## Not done yet (later 90-day items — awaiting this deploy approval first)
- New blog posts (choose agency / hire vs agency)
- Full long-title sweep of all 30 OpenSEO flags
- Heading-order fixes sitewide
- Backlink outreach

## Deploy gate
Reply **approve deploy** to commit + push these SEO implementation files only (exclude unrelated untracked assets).
