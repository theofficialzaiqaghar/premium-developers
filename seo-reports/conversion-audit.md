# Conversion & Lead Generation Audit

## Funnel reality (actual)

| Stage | Evidence |
|-------|----------|
| Organic discovery | Rising impressions (esp. Woo/Elementor) |
| SERP click | **Fails** for commercial queries (0 CTR) |
| On-site session | GA4 69 organic sessions / 28d; engagement ~58% |
| Lead event | **0 organic key events** |
| Paying client from SEO | Not measurable in GA4 |

**Primary bottleneck today is SERP CTR + ranking, then measurement.** On-page CRO matters after clicks arrive.

## What exists (repo/live)

- `/contact` with project discussion + package presets  
- Nav CTA “Book a Consultation” on service pages  
- Homepage pricing / launch packages  
- Case studies + portfolio work pages  
- Special offer / exit-intent flows (site features)  
- Trust: founder schema, social sameAs, Upwork/Contra links  

## Why organic visitors may leave

1. **Never click** — titles/metas don’t win hire SERPs.  
2. Land on **informational blog** for hire queries (cannibalization) without strong service CTA hierarchy.  
3. **Proof depth** below competitors on money pages (metrics, stack, timelines).  
4. **Pricing ambiguity** for US visitors (GBP-first).  
5. **No measured lead** — even converting users may not fire key events.

## Recommendations (approve before implementing)

| Priority | Change | Why |
|----------|--------|-----|
| P0 | Define GA4 key events: form_submit, generate_lead, whatsapp_click, consultation_click | Make SEO accountable |
| P0 | Money-page hero CTA + secondary WhatsApp/email | Reduce friction |
| P1 | Case study block with outcomes on Woo/WP/Elementor pages | Trust |
| P1 | GBP + USD pricing guidance on cost content | UK+US |
| P1 | Blog end-CTA: “Hire a WooCommerce developer” → service | Intent bridge |
| P2 | Contact page social proof above form | Lift submit rate |
| P2 | Ensure package deep-links from pricing still work post-apex | Continuity |

## KPI

- Organic key events > 0 within 7 days of tracking fix  
- Contact sessions from organic landing money pages  
- Quote form starts / submits by country (UK vs US)
