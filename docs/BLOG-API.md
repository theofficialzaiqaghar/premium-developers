# Blog CMS HTTP API (Phase 3)

Base URL (production): `https://www.premiumdevelopers.co`

Authentication uses an HttpOnly session cookie (`pd_blog_session`) plus CSRF header on mutating requests.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | Yes | Existing Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Existing Upstash token |
| `BLOG_ADMIN_PASSWORD` | Yes | Admin password (min 12 characters), server-only |
| `BLOG_SESSION_SECRET` | Yes | Random secret (min 32 characters) for rate-limit hashing |
| `BLOG_COOKIE_SECURE` | No | `true` / `false`; auto-secure off localhost |

Future (not used yet): `BLOG_INGEST_SECRET` for local automation.

---

## Auth

### `POST /api/blog/login`

- Same-origin required (`Origin` must match `Host`).
- Body: `{ "password": "..." }`
- Rate limit: 5 failed attempts per IP per 15 minutes.
- Success: sets `pd_blog_session` cookie, returns `{ ok, csrfToken, expiresAt }`.

### `GET /api/blog/session`

- Returns `{ ok, authenticated, csrfToken?, expiresAt? }`.

### `POST /api/blog/logout`

- Requires session cookie + header `X-PD-Blog-CSRF: <csrfToken>`.
- Clears session cookie.

---

## Admin — articles

All routes below require session cookie except where noted.

### `GET /api/blog/articles`

Query: `status`, `search` or `q`, `limit`, `offset`.

### `POST /api/blog/articles`

- CSRF required.
- Creates article (default status `draft`). Cannot create with `status: published`.

### `GET /api/blog/article?id=<uuid>`

### `PATCH /api/blog/article?id=<uuid>`

- CSRF required.
- Partial update. Publishing requires `status: "published"` **and** `publishedAt` (ISO).

### `DELETE /api/blog/article?id=<uuid>`

- CSRF required.

### `GET /api/blog/history?articleId=<uuid>`

Returns `{ revisions: [...] }` (stored snapshots).

### `GET /api/blog/stats`

Returns `{ total, published, byStatus }` counts.

### `GET /api/blog/slug-check?slug=<slug>&excludeId=<uuid?>`

Returns `{ available: boolean }`.

### `GET /api/blog/preview?id=<uuid>`

Authenticated HTML preview (`X-Robots-Tag: noindex`). **Not** a public URL.

---

## Admin UI

Static dashboard: `/admin/blog/` (uses APIs above; no secrets in JavaScript).

HTML bodies are sanitized server-side on create/update (see `api/blog/_lib/sanitize.js`).

---

## Admin — taxonomy

### `GET|POST /api/blog/categories`

- POST: CSRF, body `{ name, slug?, description? }`.

### `DELETE /api/blog/categories?slug=<slug>`

- CSRF required.

### `GET|POST /api/blog/tags`

- POST: CSRF, body `{ name, slug? }`.

### `DELETE /api/blog/tags?slug=<slug>`

- CSRF required.

---

## Admin — backup

### `GET /api/blog/backup`

- JSON download of all articles (and categories/tags).

### `POST /api/blog/backup`

- CSRF required.
- Body: backup JSON; optional `onSlugConflict: "skip"`.

---

## Public read (no auth)

Published articles only. Draft / in review / approved / scheduled return **404** on single-article fetch (no content leak).

### `GET /api/blog/public/articles`

Query: `limit`, `offset`. Cached briefly (`Cache-Control: public, max-age=60`).

### `GET /api/blog/public/article?slug=<slug>`

## Public HTML (Phase 4)

| URL | Handler |
| --- | --- |
| `/blog/` | SSR archive (`/api/blog/ssr/archive`) |
| `/blog/{slug}/` | SSR article (`/api/blog/ssr/article?slug=`) |
| `/sitemap-blog.xml` | Dynamic sitemap (`/api/sitemap-blog`) |

Non-published slugs return **HTTP 404** HTML (not a 200 shell). JSON public API remains available at `/api/blog/public/*`.

---

## CSRF

Send on all authenticated `POST`, `PATCH`, `DELETE`:

```http
X-PD-Blog-CSRF: <csrfToken from login or session>
```

Cookie must be included (`credentials: 'include'` from browser).
