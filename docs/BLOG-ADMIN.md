# Blog admin dashboard (Phase 5)

URL: **https://www.premiumdevelopers.co/admin/blog/**

## Access

1. Set Vercel env: `BLOG_ADMIN_PASSWORD` (min 12 chars), `BLOG_SESSION_SECRET` (min 32 chars), Upstash vars.
2. Open `/admin/blog/` and sign in.
3. Session cookie + `X-PD-Blog-CSRF` header are managed automatically by the dashboard script.

## Features

- Overview stats (`/api/blog/stats`)
- Article list with search, status filter, pagination
- Quill rich-text editor (headings, lists, links, images, tables via HTML paste)
- SEO fields, slug availability check, featured image URL/alt
- Save draft, explicit **Publish…** confirmation (sets `publishedAt`)
- Scheduled status stores `scheduledAt` only — **no auto-publish** in this phase
- Preview via authenticated `/api/blog/preview?id=` (never public)
- Categories/tags CRUD, backup export/import, revision history dialog

## Security

- Article HTML is sanitized on **every create/update** in `normalizeArticle()` (`api/blog/_lib/sanitize.js`).
- Admin UI contains **no secrets** — only calls existing APIs with cookies.

Local testing: `npm run dev:vercel` then visit `/admin/blog/`.
