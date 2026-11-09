# Google Ads readiness (Premium Developers)

This document describes what the **codebase** provides for Google Ads and what you must configure in **external accounts** after deploy.

## Site conversion events (dataLayer)

| Event | When it fires | Use in Google Ads |
| --- | --- | --- |
| `generate_lead` | Successful POST to `/api/contact` only (`contact`, `service_inquiry`, `home_inquiry`) — paired with `form_submit` | **Primary conversion** |
| `form_submit` | Same successful submits as `generate_lead`, plus special-offer and exit-intent on success (`lead_outcome: success`) | GA4 recommended event / backup conversion trigger |
| `form_start` | First focus inside a lead form (`contact`, `service_inquiry`, `home_inquiry`) | Funnel micro-conversion |
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
2. Create **Custom Event** triggers for `generate_lead`, **`form_submit`**, `form_start`, `click_whatsapp`, etc. (if GA4 only shows form starts, you are likely missing a trigger for `generate_lead` / `form_submit`.)
3. For `generate_lead`, add trigger condition: `form_name` matches `contact|service_inquiry|home_inquiry` (optional extra safety).
4. Tag GA4 events from those triggers; mark `generate_lead` as a conversion in GA4.
5. Link GA4 ↔ Google Ads; import or create **Google Ads conversion** from the GA4 `generate_lead` event (or Ads tag firing on the same trigger).
6. Test with **GTM Preview** + **Tag Assistant** on production URLs after deploy.

### If Preview shows `form_submit` / `generate_lead` but **Tags Fired: None**

The site is working. GTM received the dataLayer push (you should see `lead_outcome: success`, `form_name`, `form_id`, etc.). Consent is not the blocker if **Current State** is Granted for `analytics_storage`.

You still need **GA4 Event tags** wired to **Custom Event** triggers (the config tag `G-L1VTZF5Y5J` and `contact_page_view` only fire on page load / `contact_page_view`, not on form success).

| Step | GTM |
| --- | --- |
| 1 | **Triggers → New → Custom Event** → Event name: `generate_lead` |
| 2 | **Tags → New → Google Analytics: GA4 Event** → Configuration Tag = your GA4 config → Event name: `generate_lead` → Trigger = step 1. Add event parameters: `form_name`, `service_name`, `inquiry_reason`, `source_page`, `lead_outcome` (Data Layer Variable names must match keys pushed by the site). |
| 3 | Optional duplicate trigger: Custom Event `form_submit` **and** `lead_outcome` equals `success` (avoids counting GTM’s automatic “Form Submit” when `formCanceled` is true because JavaScript uses `preventDefault()`). |
| 4 | **Publish** container. Preview again → on event `generate_lead` → **Tags Fired** should list your GA4 Event tag → **Hits Sent** should show a hit. |
| 5 | **GA4 → Admin → Events** → mark `generate_lead` as **Key event**. Realtime / DebugView should increment within minutes. |

**Ignore for conversions:** GTM’s built-in **Form Submit** (often `gtm.formCanceled: true` on this site). Use **`generate_lead`** or custom **`form_submit`** with `lead_outcome: success` only.

### Special offer form (`/special-offer/`)

On **successful** submit (API OK + success message), the site pushes:

| dataLayer `event` | When |
| --- | --- |
| `special_offer_submit` | Primary — use this in GTM (same pattern as `generate_lead`) |
| `form_submit` | Mirror with `form_name: special_offer`, `lead_outcome: success` |

Example parameters: `form_name`, `form_id`, `form_destination`, `offer_type` (`30_percent_off`), `services_selected`, `marketing_consent`, `lead_outcome`.

**GTM (copy of contact setup):**

1. **Variables** (Data Layer Variable): `offer_type`, `services_selected`, `marketing_consent`, `lead_outcome` (reuse `form_name` if you already have it).
2. **Trigger → Custom Event** → Event name: `special_offer_submit` (no extra conditions for first test).
3. **Tag → GA4 Event** → Configuration = your GA4 config tag → **Event name: `special_offer_submit`** (no `GA4 - ` prefix) → Trigger = step 2 → add Event Parameters from DLVs above.
4. **Publish** → Preview on `https://www.premiumdevelopers.co/special-offer/` → accept cookies → submit test → select event **`special_offer_submit`** in sidebar → Tags Fired should show **Succeeded**.
5. **GA4 → Admin → Events** → mark `special_offer_submit` as **Key event** only if you run offer-specific Ads (keep `generate_lead` as primary for main lead gen).

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
