# Exit feedback discount offer

The site is a static Vercel deployment. The exit offer uses a Vercel serverless
function, Resend for email, and Upstash Redis REST for durable feedback storage.
It does not depend on a WordPress or WooCommerce runtime.

## Configure before enabling the offer

1. Create and test a **real 35% discount code** in the checkout system that will
   honor it. This site has no checkout or WooCommerce installation, so it cannot
   verify coupon validity against a store. The API does not issue a code from
   source control: it remains disabled until a configured code is supplied and
   explicitly confirmed after testing.
2. Verify the sending domain in Resend and set `RESEND_API_KEY`. Set `MAIL_FROM`
   to a verified sender and `CONTACT_TO` to the inbox that should receive feedback.
3. Create an Upstash Redis database with its REST API enabled. Copy its HTTPS REST
   URL and token into `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN`.
4. Add the following environment variables to Vercel (and to a local `.env`
   file for local development):

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `EXIT_DISCOUNT_CODE` | Yes | Existing, tested checkout coupon code. |
   | `EXIT_DISCOUNT_PERCENT` | No | Discount percentage; defaults to `35`. |
   | `EXIT_DISCOUNT_EXPIRES_AT` | No | Coupon expiration as an ISO-8601 date/time. Expired or invalid dates disable the offer. Leave blank only for a coupon with no expiration. |
   | `EXIT_DISCOUNT_CONFIRMED` | Yes | Set to `true` only after verifying the configured coupon and percentage at checkout. |
   | `EXIT_DISCOUNT_EMAIL_SUBJECT` | No | Discount email subject; a branded default is used when blank. |
   | `EXIT_DISCOUNT_EMAIL_INTRO` | No | Short plain-text introduction in the requested-code email. |
   | `EXIT_FEEDBACK_RETENTION_DAYS` | No | Redis feedback retention from 1 to 3650 days; defaults to `365`. |
   | `RESEND_API_KEY` | Yes | Existing Resend API credential. |
   | `MAIL_FROM` | Yes | Verified sender identity. |
   | `CONTACT_TO` | Yes | Inbox to receive the feedback copy. |
   | `UPSTASH_REDIS_REST_URL` | Yes | HTTPS Upstash Redis REST endpoint. |
   | `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash REST credential. |

   `.env.example` lists the variables without credentials. Never put real keys
   in frontend code or commit them. Redeploy after changing Vercel environment
   variables. For local serverless testing, use `vercel dev` with the Vercel CLI
   and local environment values; a plain static file server cannot run the API.

5. Set `EXIT_DISCOUNT_CONFIRMED=true` only after verifying the exact code,
   percentage, and expiration against the actual checkout system. Then verify
   the offer is enabled by requesting `/api/exit-feedback`; it should
   return `{"enabled":true,"discountPercent":35}`. If it returns
   `{"enabled":false,...}`, check the coupon, expiration, Resend, and Upstash
   configuration. Until configured, the public popup stays disabled and the
   submit endpoint will not claim success.

## Behavior and preferences

- Desktop: after the visitor has spent at least 1.5 seconds on the page, the
  popup opens only when the pointer moves upward to the top edge.
- Coarse-pointer/mobile devices: the popup uses an in-page alternative. It may
  open when a visitor has scrolled down at least 500 pixels and then scrolls
  upward to the top. It does not alter browser history or intercept Back, and
  does not claim to detect tab closing.
- The popup is recorded in local storage when opened or dismissed, and appears
  again after 30 days. To change the frequency, update
  `data-frequency-days="30"` on the `/exit-intent.js` script tag in the HTML
  pages. If local storage is blocked, the script falls back to session storage.
- For visual testing, append `?exitIntentDebug=1` to any page. This opens the
  popup after page load and bypasses frequency/configuration checks; form
  submission still requires the configured backend services.
- Feedback is stored in the Upstash sorted set `exit-feedback:submissions`.
  Inspect it with `ZRANGE exit-feedback:submissions 0 -1 WITHSCORES` in the
  Upstash console. The set is pruned to the configured retention period.
  Protect access to the Redis console and credentials as the records contain
  email addresses and feedback.
- The requested discount-code email is sent regardless of the optional
  promotional consent checkbox. The checkbox preference is recorded with the
  feedback; this implementation does not add addresses to a marketing list or
  send ongoing promotional email.

## Mobile and accessibility notes

The modal uses the native accessible dialog element, supports Escape and its
visible close button, restores focus, and locks background scrolling while open.
The mobile trigger is intentionally a scroll cue rather than a History API
back-button trap. Reduced-motion settings disable the entrance animation.
