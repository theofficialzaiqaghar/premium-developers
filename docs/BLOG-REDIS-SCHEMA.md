# Blog CMS — Upstash Redis schema (Phase 2)

All keys use the dedicated prefix **`blog:`** so they never collide with special-offer or exit-feedback keys.

## Upstash free tier (verified March 2025+ docs)

| Limit | Value | Implication for blog CMS |
| --- | --- | --- |
| Price | $0 / month | Same database as existing integrations |
| Storage | 250 MB | Hundreds of full HTML articles if each JSON stays well under 1 MB |
| Commands | 500,000 / month | Admin + daily automation must batch where possible; monitor dashboard |
| Bandwidth | 10 GB / month | Public SSR (Phase 4) will consume bandwidth separately |
| Max request size | 10 MB | Single `SET` of article JSON must stay **under 10 MB** (code limit: 9 MB) |
| Max record size | 100 MB | Theoretical per key; REST request cap is the practical limit |

**Suitability:** One JSON document per article with indexes (sorted sets) is appropriate for create/read/update/list/export on the free tier. Full-text search at scale may require scanning articles in Phase 3 (acceptable for low volume) or future RediSearch (not on free tier today).

## Key layout

| Key | Type | Purpose |
| --- | --- | --- |
| `blog:meta:schema_version` | string | Schema version integer |
| `blog:slug:{slug}` | string | Maps slug → article UUID |
| `blog:article:{id}` | string | Full article JSON |
| `blog:articles:by_updated` | sorted set | All articles; score = `updatedAt` ms |
| `blog:articles:by_status:{status}` | sorted set | Filter by workflow status |
| `blog:articles:published` | sorted set | Published only; score = `publishedAt` ms |
| `blog:history:{id}` | list | Last 50 JSON snapshots per article |
| `blog:category:{slug}` | string | Category JSON (Phase 3+) |
| `blog:categories:all` | set | Category slug index |
| `blog:tag:{slug}` | string | Tag JSON (Phase 3+) |
| `blog:tags:all` | set | Tag slug index |
| `blog:backup:manifest` | string | Last export metadata |
| `blog:session:{uuid}` | string | Admin session JSON (TTL 12h) |
| `blog:login:rate:{hash}` | string | Login attempt counter per IP (15 min window) |

## Article JSON (schema version 1)

Required fields: `id`, `slug`, `status`, `title`, `bodyHtml`, `createdAt`, `updatedAt`, `revision`, `schemaVersion`.

Statuses: `researching`, `generated`, `draft`, `in_review`, `approved`, `scheduled`, `published`, `rejected`, `failed`.

**Publishing rule:** Automation must stop at `draft` / `in_review`. Setting `published` requires explicit `publishedAt` (manual approval in later phases).

## Operations

- **Create:** Lua script — atomic slug uniqueness + indexes.
- **Update:** Lua script — slug change, status index move, published index maintenance.
- **Delete:** Lua script — slug, article, indexes, history.
- **Backup:** `exportBackup()` walks `blog:articles:by_updated` and collects JSON (no Redis SCAN required).
- **Restore:** `importBackup()` with `onSlugConflict: 'fail' | 'skip'`.

## Environment variables (existing + future)

Phase 2 uses only:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Later phases will add admin session secrets (not used in Phase 2).

## Module map

- `api/blog/_lib/redis.js` — REST client
- `api/blog/_lib/keys.js` — key names
- `api/blog/_lib/validate.js` — validation + normalization
- `api/blog/_lib/store.js` — CRUD + indexes
- `api/blog/_lib/backup.js` — export / import
