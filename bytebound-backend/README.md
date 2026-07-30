# ByteBound Backend

Fastify backend API for ByteBound — search books, fetch metadata, and get download links. Deployed on Vercel as a serverless function.

## API Endpoints

Base URL: `https://bytebound-five.vercel.app/docs`

### Health

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Service health check |

### Books

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/v1/books/search?q=...&page=1&format=epub&language=english` | Search books. Returns up to 25 results with `md5`, `title`, `author`, `format`, `language`. |
| GET | `/v1/books/topics` | List interest topics (chips) for onboarding. |
| GET | `/v1/books/discover?topics=programming,history&language=en` | Books for the selected interest topics. |
| GET | `/v1/books/trending?language=en` | Popular books for the "Trending this week" carousel. |
| GET | `/v1/books/recommendations?topics=programming&format=epub` | Personalised-looking books by topic; falls back to trending when no topics are given. |
| GET | `/v1/books/:md5` | Full book metadata: title, author, publisher, year, ISBN, description, cover URL, etc. |
| GET | `/v1/books/:md5/cover` | Proxied cover image (JPEG bytes, `Cache-Control: max-age=86400`). Use this in the app instead of hotlinking. |

### Links

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/v1/links/:md5` | Download links. Returns partner links (`fast`/`slow`) + direct IPFS gateway links (`ipfs`). |
| GET | `/v1/links/:md5?type=ipfs` | Filter by link type: `ipfs`, `fast`, or `slow`. |

**Link types:** `ipfs` = direct file URL (download programmatically, e.g. `expo-file-system`); `fast` = requires membership login; `slow` = free but behind a browser check (open in system browser/WebView).

Interactive docs: `/docs` (Swagger UI).

> **Note:** Legacy unversioned paths (`/books/*`, `/links/*`) still work but are hidden from docs. Prefer `/v1/*`.

## Local Development

```bash
cd bytebound-backend
npm install
npm run dev        # node --watch src/server.js  →  http://localhost:3000
npm test           # node --test
```

## Deployment (Vercel)

1. **Root Directory:** Vercel → Project Settings → General → Root Directory → `bytebound-backend`
2. Push to your connected Git branch — Vercel builds `api/index.js` as the serverless function entry.
3. `vercel.json` rewrites all paths to the function.

## Environment Variables

Set these in Vercel → Project Settings → Environment Variables (or a local `.env`):

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `SOURCE_BASE_URL` | `https://annas-archive.gl` | Upstream source site |
| `USER_AGENT` | Chrome UA string | User-Agent for upstream requests |
| `FETCH_TIMEOUT_MS` | `8000` | Upstream fetch timeout (keep under Vercel's 10s limit) |
| `CACHE_TTL_MS` | `3600000` (1h) | In-memory cache TTL for search/details/links |
| `CACHE_MAX_ENTRIES` | `500` | Max cache entries |
| `RATE_LIMIT_MAX` | `30` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW` | `1 minute` | Rate limit window |
| `SENTRY_DSN` | _(unset)_ | Sentry DSN — error tracking disabled if unset |
| `SENTRY_ENVIRONMENT` | `VERCEL_ENV` or `development` | Sentry environment tag |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | Sentry performance traces sample rate |

## Stack

- **Fastify 5** + `@fastify/cors`, `@fastify/sensible`, `@fastify/swagger(-ui)`, `@fastify/rate-limit`
- **Cheerio** for HTML scraping
- **@sentry/node** for error tracking (optional)
- Serverless entry: `api/index.js` (native `(req, res)` handler)
