# Special offer setup

The website is a static Vercel deployment with serverless API routes, not a
WordPress installation. The offer form uses the existing Resend email provider
and Upstash Redis storage pattern; it does not add a form plugin or package.

## Required Vercel environment

Configure these values for the Vercel project and redeploy. Resend is required
to deliver inquiries; Upstash provides the preferred database storage:

| Variable | Required | Purpose |
| --- | --- | --- |
| `RESEND_API_KEY` | Yes | Server-side Resend API credential. |
| `MAIL_FROM` | Recommended | Sender identity verified in Resend. Defaults to `Premium Developers <hello@premiumdevelopers.co>`. |
| `UPSTASH_REDIS_REST_URL` | Recommended | HTTPS Upstash Redis REST endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash REST credential. |
| `SPECIAL_OFFER_LEAD_RETENTION_DAYS` | No | Lead retention in days, from 1 to 3650; defaults to 365. |

Never put provider credentials in frontend code or source control. Confirm the
sender domain is verified in Resend and the Redis endpoint uses HTTPS. The
notification request includes both `hello@premiumdevelopers.co` and
`muhammadsaadullah093@gmail.com`.

At implementation time, no `.env` file or local configuration containing the
Resend and Upstash variables was present, and this repository has no WordPress
runtime. Configure `RESEND_API_KEY` and a verified sender in Vercel before
expecting inquiries to be delivered. A plain static file server cannot execute
the API route; use `vercel dev` with local environment values to test the whole
flow.

## Lead handling

`POST /api/special-offer` validates the request, reserves a submission id, and
stores the lead before attempting notification. The private Upstash sorted-set
index is `special-offer:submissions`; each record is stored at
`special-offer:lead:<submission-id>` and expires after the configured retention
period. The API exposes no read/list operation. If Redis is unavailable, the
endpoint falls back to sending the inquiry to both configured inboxes through
Resend and only reports success if Resend accepts the email. This keeps the
inquiry in the recipient mailboxes instead of blocking the form, but does not
create a Redis database record. Resend idempotency keys reduce duplicate
notifications when the browser retries the same submission. If Resend is
unavailable after a Redis save, the form reports that the inquiry was saved.

Email delivery is sent through Resend only when that endpoint is called. The
mail credentials and production hosting configuration were not available in
this checkout, so live delivery and the production Redis store must be verified
after Vercel environment setup.
