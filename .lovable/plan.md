# Aniware — Build Plan

A clean, dark "Midnight Indigo" anime streaming site. Backend uses Lovable Cloud (Supabase). Heavy ingestion/processing (FFmpeg, torrents, Real-Debrid, remote uploads) is intentionally **out of scope** — that lives on an external worker you run separately. The web app handles browsing, watching via iframe embeds, downloads, admin entry of links, and automated provider health checks.

## Scope (what gets built)

**In:**
- Public site: Home, Browse/Search, Anime detail with episode grid, Watch page, custom Download page
- Auth: email/password + Google sign-in, user profiles
- User features: watchlist, continue-watching, watch progress
- Admin panel: add/edit `media_links`, view provider health, trigger re-check
- Provider abstraction: Streamtape (primary) + Mp4Upload (fallback); generic iframe support
- Health check server function (HTTP probe + HTML body check) callable from admin and a cron-style public endpoint
- Metadata from Jikan API (no key needed) with caching

**Out (needs external worker; documented in README):**
- Torrent/Real-Debrid ingestion, FFmpeg processing, automated remote-uploads to Streamtape/Mp4Upload, queue workers, dead-letter queue, dynamic scaling

## Pages / Routes

- `/` — hero, trending (Jikan top), seasonal, recently added (rows from our DB)
- `/browse` — search + filter (genre, status, year) backed by Jikan
- `/anime/$malId` — synopsis, poster, metadata, episode grid with availability badges
- `/watch/$malId/$episode` — 16:9 iframe player, provider switcher, quality switcher, prev/next, auto-fallback, subtitle loader
- `/download/$malId/$episode` — quality picker → "Preparing…" → redirect to best healthy mirror
- `/login`, `/signup`, `/reset-password`
- `/_authenticated/watchlist`, `/_authenticated/history`
- `/_authenticated/_admin/` — dashboard, `media_links` CRUD, provider health, recheck button
- `/api/public/health-check` — POST (signed) to run a batch health pass

## Database (Lovable Cloud)

- `profiles` (id → auth.users, username, avatar_url)
- `user_roles` (user_id, role: 'admin'|'user') + `has_role()` security definer
- `anime_cache` (mal_id PK, title, synopsis, poster_url, episodes, year, genres jsonb, updated_at) — Jikan cache
- `media_links` (id, mal_id, episode_number, server_name, quality, embed_url, direct_download_url, subtitle_url, priority, is_active, status, last_checked_at, last_failed_at, retry_count, health_score, created_at)
- `watch_progress` (user_id, mal_id, episode_number, position_seconds, updated_at) — composite PK
- `watchlist` (user_id, mal_id, added_at)
- RLS: public read on `anime_cache` + active `media_links`; user-scoped on `watch_progress`/`watchlist`; admin-only write on `media_links` via `has_role`

## Server functions

- `getAnimeDetails(malId)` — cache-through to Jikan
- `searchAnime(query, filters)` — Jikan proxy with rate-limit friendly debounce
- `getEpisodeSources(malId, ep)` — returns active sources ordered by priority + health
- `checkProviderHealth(linkId)` — fetches embed URL, inspects status + body for Streamtape/Mp4Upload removal markers; updates row
- `batchHealthCheck()` — iterates stale links (admin/cron)
- `upsertMediaLink(...)` — admin only (RLS-checked)

## UI / Design

- Midnight Indigo palette: bg `#0a0a1a`, surface `#141432`, deep `#1e1e5a`, accent `#4f46e5`
- Typography: Space Grotesk (display) + Inter (body)
- Components: shadcn (Card, Dialog, DropdownMenu, Skeleton, AspectRatio, Tabs, Badge)
- Episode grid: responsive compact buttons, badges (SUB/1080p/MULTI), hover, watch-progress bar, skeleton states, pagination
- Watch page: AspectRatio 16:9 iframe, provider/quality/subtitle selects, prev/next, autoplay-next toggle, fallback to next provider on iframe error
- Download page: branded "Preparing your download…" with spinner, then `window.location =` direct URL

## Technical notes

- TanStack Start file-routes, every public route gets unique `head()` meta
- Loaders call server fns; admin loaders sit under `_authenticated/_admin/` layout with role guard
- Provider abstraction module `src/lib/providers/{streamtape,mp4upload,generic}.ts` exposing `{ validateEmbedHtml(html), normalizeUrl(url) }`
- Health check uses `fetch` from server function (Worker-safe, no Node deps)
- No torrent/FFmpeg code in this app — README documents the external worker contract: it inserts rows into `media_links` via service-role key

## Build order

1. Enable Lovable Cloud, create schema + RLS + roles
2. Auth (email+Google), profiles, role-guarded admin layout
3. Jikan integration + caching server fns
4. Home, Browse, Anime detail with episode grid
5. Watch page with provider fallback + subtitles
6. Custom Download page
7. Admin: media_links CRUD + health dashboard
8. Health-check server fn + public cron endpoint
9. Watchlist + continue-watching
10. Polish, SEO meta per route, README with external-worker contract