# Historical Performance — Premium Developers

**Property:** `sc-domain:premiumdevelopers.co`  
**GA4:** Premium Developers (`properties/561628773`)  
**Note:** GSC dates are Pacific Time; last ~3 days may be incomplete.

## Coverage caveat

Meaningful GSC rows begin **2026-10-08**. There is **no reliable 6–12 month organic history** yet. “Last 12 months” API calls return sparse early zeros then the Oct–Nov ramp.

## Daily trend (GSC date dimension, available window)

| Period | Pattern |
|--------|---------|
| 8–20 Oct 2026 | Low impressions (1–18/day), intermittent clicks |
| 21 Oct–7 Nov | Building: often 5–25 impressions/day |
| 8–17 Nov | Breakout: **56 → 203 impressions/day**; clicks remain low (0–5) |

### Last 7 days (11–17 Nov 2026)

| Date | Clicks | Impressions | CTR | Avg position |
|------|--------|-------------|-----|--------------|
| 11 Nov | 2 | 76 | 2.6% | 75.6 |
| 12 Nov | 0 | 77 | 0.0% | 73.9 |
| 13 Nov | 0 | 102 | 0.0% | 59.6 |
| 14 Nov | 1 | 106 | 0.9% | 68.2 |
| 15 Nov | 1 | 105 | 0.9% | 65.7 |
| 16 Nov | 1 | 114 | 0.9% | 59.7 |
| 17 Nov | 4 | 203 | 2.0% | 56.0 |
| **Sum** | **9** | **783** | **1.1%** | — |

**vs previous 7 days (approx 4–10 Nov):** impressions materially higher; CTR lower as non-brand queries flooded the index. Position improved slightly late period (~56 on 17 Nov).

### Last 28 days (21 Oct–17 Nov 2026) — devices

| Device | Clicks | Impressions | CTR | Position |
|--------|--------|-------------|-----|----------|
| Desktop | 42 | 992 | 4.2% | 64.2 |
| Mobile | 12 | 336 | 3.6% | 72.3 |
| Tablet | 0 | 26 | 0.0% | 89.5 |
| **Total** | **54** | **1,354** | **4.0%** | — |

### Previous comparable window (23 Sep–20 Oct 2026) — queries

Only **9 query rows**, almost all WooCommerce variants with **0 clicks**. Impression base was tiny (~44 total listed impressions). **Conclusion:** site is in early indexation phase; MoM growth is impression-led, not conversion-led.

### Last ~90 days / 3 months (17 Aug–17 Nov)

Top page still homepage (`www`) with **51 clicks / 158 impressions / 32.3% CTR / pos 6.9**. Commercial service pages show hundreds of impressions and **0 clicks**.

## Country split (last 28 days)

| Country | Clicks | Impressions | CTR | Position | Interpretation |
|---------|--------|-------------|-----|----------|----------------|
| Pakistan | 39 | 66 | 59.1% | 7.5 | Brand/nav — not UK/US pipeline |
| United Kingdom | 13 | 399 | 3.3% | 69.7 | Real commercial demand, poor CTR |
| United States | 0 | 534 | 0.0% | 74.0 | Demand without SERP appeal |
| Canada | 0 | 59 | 0.0% | 75.7 | Adjacent English market |
| India | 0 | 44 | 0.0% | 42.8 | Mixed intent |
| Others | sparse | — | — | — | Low volume |

## GA4 organic overview

**Current:** 21 Oct–17 Nov 2026  
**Previous:** 23 Sep–20 Oct 2026 (API returned “—” for previous totals — treat as insufficient baseline)

| Metric | Current |
|--------|---------|
| Sessions | 69 |
| Active users | 13 |
| Engaged sessions | 40 |
| Engagement rate | 58% |
| Key events | **0** |
| Transactions / revenue | 0 |

Weekly organic sessions rose mid-period (week 202646: 38 sessions) then cooled (202647: 11).

### Organic landing pages (GA4, same window)

| Landing page | Sessions | Engaged | Key events |
|--------------|----------|---------|------------|
| `/` | 44 | 25 | 0 |
| `/about` | 4 | 1 | 0 |
| `/case-studies/the-lynx-med-spa` | 4 | 3 | 0 |
| `/blog` | 3 | 2 | 0 |
| `/services.html` | 3 | 3 | 0 |
| `/services/woocommerce-development.html` | 1 | 1 | 0 |
| `/contact` | 1 | 1 | 0 |

## Interpretation

1. **Indexation success:** Google is discovering commercial URLs.  
2. **Monetization failure:** Hire-intent impressions do not click; homepage absorbs brand clicks.  
3. **Measurement failure:** Zero organic key events → cannot attribute SEO → leads.  
4. **Host consolidation:** Apex is now primary; expect GSC www/apex duplicate page rows to merge over weeks.

## Recommended reporting cadence

- Weekly: GSC queries with impressions ≥20 and CTR = 0  
- Weekly: UK vs USA country filter  
- Monthly: page cannibalization (`query`+`page`) for WooCommerce / Elementor / WordPress  
- Monthly: GA4 organic key events once tracking is fixed  
