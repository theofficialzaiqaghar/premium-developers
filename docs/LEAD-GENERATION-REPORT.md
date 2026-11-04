# Lead generation & conversion — implementation report

## Strategy (audit summary)

- **Existing stack reused:** `/api/contact` (Resend, honeypot, rate limit, validation), `contact-page.css`, GTM (`GTM-WF285DKZ`), `analytics.js` → `dataLayer`.
- **Gap:** Service pages linked to `/contact` only; no on-page conversion for Google Ads landing URLs.
- **Approach:** Shared `lead-forms.js` for all inquiry UIs; one **service-specific** form per service page (`#project-inquiry`); **home + services overview** use a service picker form. CTAs scroll to the form (no forced redirect to Contact).

## New / updated assets

| File | Role |
| --- | --- |
| `lead-forms.js` | Shared validation, submit to `/api/contact`, success UI, GTM `generate_lead` (deduped) |
| `service-page-leads.js` | Mount service forms, smooth scroll, `cta_click` tracking |
| `homepage-leads.js` | Homepage + services overview multi-service quote form |
| `service-inquiry.css` | Inquiry section layout (service pages + homepage) |
| `analytics.js` | Added `pdTrackOnce()` to prevent duplicate conversion pushes |
| `contact.js` | Thin wrapper → `PDLeadForms.initContactPageForm()` |
| `api/contact.js` | `Custom WordPress Plugin Development` service; email includes `formName` + `sourcePage` |
| `scripts/patch-service-lead-pages.js` | Batch patch for 12 service HTML files |
| `scripts/fix-service-cta-classes.js` | Fix duplicate `class` attributes after patch |

## Form locations

| Page | Form ID / anchor | `formName` (GTM) | Pre-selected service |
| --- | --- | --- | --- |
| `contact.html` | `#contact-form` | `contact` | User selects (full form) |
| `index.html` | `#home-project-inquiry` | `home_inquiry` | User selects from dropdown |
| `services.html` | `#project-inquiry` | `home_inquiry` | User selects from dropdown |
| Each `services/*.html` (12 pages) | `#project-inquiry` | `service_inquiry` | Fixed per page (`data-pd-service`) |

### Service pages with embedded quote forms

1. `services/wordpress-development.html` — WordPress Development  
2. `services/elementor-development.html` — Elementor Development  
3. `services/woocommerce-development.html` — WooCommerce Development  
4. `services/website-redesign.html` — Website Redesign  
5. `services/custom-development.html` — Custom Development  
6. `services/custom-wordpress-plugin-development.html` — Custom WordPress Plugin Development  
7. `services/landing-pages.html` — Landing Pages  
8. `services/speed-performance.html` — Speed & Performance  
9. `services/maintenance-support.html` — Maintenance & Support  
10. `services/essential-web.html` — Essential Web  
11. `services/custom-apps.html` — Custom Apps  
12. `services/enterprise.html` — Enterprise  

## CTA destinations

- **Primary pattern:** `href="#project-inquiry"` + class `pd-lead-cta` → smooth scroll to on-page form.
- **Homepage / nav:** `#home-project-inquiry` for “Book a Consultation” and “Discuss Your Project”.
- **Upwork:** Kept as secondary ghost button where it existed; primary quote CTA added where missing.
- **Mid-page:** Inline “Get a free quote · Request pricing” under first benefits section on each service page.
- **Footer service CTA band:** Quote button + optional second action (Upwork or “Discuss your project”).
- **Contact page:** Unchanged URL; still full form for general inquiries.

## Google Tag Manager / GA4 events

Push via `window.pdTrack` / `window.pdTrackOnce` → `dataLayer`:

| Event | When | Key parameters |
| --- | --- | --- |
| `generate_lead` | Successful form submit (once per submit) | `form_name`, `service_name`, `services_selected`, `source_page`, `inquiry_reason` |
| `cta_click` | Click on `#project-inquiry` / `#home-project-inquiry` CTAs | `cta_text`, `cta_location`, `link_target`, `service_name` |
| `click_to_call` | `tel:` link click (once per page) | `phone_number`, `link_text` |
| `contact_page_view` | Contact page load | `inquiry_reason` |

**GTM setup (your side):** Create Custom Event triggers for the names above; map `generate_lead` and `click_to_call` to GA4 conversion events; use `form_name` to segment Ads landing pages.

## Backend / spam / email

- Same **`POST /api/contact`** endpoint for all forms.
- Honeypot `hp`, minimum fill time (`elapsedMs`), origin check, rate limit unchanged.
- Inquiries emailed to configured Resend recipients (not stored in Redis — same as before contact-only flow).
- Email body now includes **Form** and **Source page** for Ads attribution.

## Testing results

| Check | Result |
| --- | --- |
| `npm test` (77 tests) | **Pass** |
| Contact API + validation | **Pass** (automated) |
| Live email delivery | **Not run here** — requires production `RESEND_API_KEY` on Vercel |
| Manual mobile / cross-browser | **Recommended after deploy** |
| GTM Preview | **Recommended** — verify one `generate_lead` per submit |

## Modified files (summary)

- **Core:** `lead-forms.js`, `service-page-leads.js`, `homepage-leads.js`, `service-inquiry.css`, `analytics.js`, `contact.js`, `contact.html`, `api/contact.js`
- **Marketing pages:** `index.html`, `services.html`, all 12 `services/*.html`
- **Docs:** `docs/LEAD-GENERATION-REPORT.md`
- **Tooling:** `scripts/patch-service-lead-pages.js`, `scripts/fix-service-cta-classes.js`

## Post-deploy checklist

1. Submit test inquiry on one service page + homepage + contact page.  
2. Confirm single `generate_lead` in GTM Preview per submission.  
3. Confirm email shows correct service + source path.  
4. Run Google Ads landing URLs to each service page (not `/contact` only).
