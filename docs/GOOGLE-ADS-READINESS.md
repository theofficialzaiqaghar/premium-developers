# Google Ads readiness (Premium Developers)

This document describes what the **codebase** provides for Google Ads and what you must configure in **external accounts** after deploy.

## Site conversion events (dataLayer)

| Event | When it fires | Use in Google Ads |
| --- | --- | --- |
| `generate_lead` | Successful POST to `/api/contact` only (`contact`, `service_inquiry`, `home_inquiry`) — once per submit via `pdTrackOnce` | **Primary conversion** |
| `click_whatsapp` | First WhatsApp FAB click per page | Optional micro-conversion |
| `click_to_call` | First `tel:` link click per page | Optional micro-conversion |
| `cta_click` | Service CTAs scrolling to `#project-inquiry` | Analytics only |
| `contact_page_view` | Contact page load | Analytics only |
| `special_offer_submit` | Successful special-offer API submit | Do **not** use as primary Ads conversion |
| `exit_offer_submit` | Successful exit-intent discount email | Do **not** use as primary Ads conversion |
| `pd_consent_update` | Cookie banner save | Consent diagnostics |

GTM container: **GTM-WF285DKZ**

## GTM setup (manual — not in repo)

1. Enable **Consent Mode v2** support in GTM (Admin → Container settings).
2. Create **Custom Event** triggers for `generate_lead`, `click_whatsapp`, etc.
3. For `generate_lead`, add trigger condition: `form_name` matches `contact|service_inquiry|home_inquiry` (optional extra safety).
4. Tag GA4 events from those triggers; mark `generate_lead` as a conversion in GA4.
5. Link GA4 ↔ Google Ads; import or create **Google Ads conversion** from the GA4 `generate_lead` event (or Ads tag firing on the same trigger).
6. Test with **GTM Preview** + **Tag Assistant** on production URLs after deploy.

## Privacy & UK/EU consent (in codebase)

- `consent-default.js` — Consent Mode defaults (denied) before GTM loads; restores saved choice from `localStorage`.
- `cookie-consent.js` + banner — Accept all / Reject non-essential / Manage choices.
- Privacy policy — analytics/advertising section updated November 4, 2026.

**Your responsibility:** Ensure GTM tags respect Consent Mode (built-in consent checks on GA4/Ads tags). Legal review for UK GDPR / PECR is recommended.

## Pre-launch checklist (production)

- [ ] Deploy latest build to `https://www.premiumdevelopers.co/`
- [ ] Vercel env: `RESEND_API_KEY` (and Upstash vars if using exit/special-offer storage)
- [ ] Submit test lead on homepage, one service page, and `/contact`; confirm email received
- [ ] GTM Preview: exactly **one** `generate_lead` per successful submit
- [ ] Cookie banner: reject → no GA4 hits (verify in Tag Assistant); accept → hits allowed
- [ ] PageSpeed Insights on 2–3 ad landing URLs (mobile)
- [ ] Ad copy aligns with on-page offers (30% special offer, exit discount terms)

## Recommended ad landing URLs

Use service pages with `#project-inquiry` or the section in view:

- `/services/wordpress-development.html`
- `/services/woocommerce-development.html`
- `/services/landing-pages.html`
- Homepage: `/#home-project-inquiry`

Avoid sending all traffic only to `/contact` unless the ad is generic.
