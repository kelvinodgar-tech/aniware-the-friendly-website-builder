# animerewa ingest worker

Runs on **GitHub Actions** every 30 minutes. Free. No server needed.
**No Supabase service-role key required** — talks to the app via a shared-secret HTTP endpoint.

## What it does

1. **scout** — Nyaa SubsPlease 720p RSS → match to Jikan top airing → POST candidates to `/api/public/worker/rpc` (action `enqueue`).
2. **ingest** — disabled legacy media pipeline kept only for repository history.

## Setup (~3 min)

1. Push this repo to GitHub (Lovable → GitHub → Connect).
2. **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**, add:
   - `APP_URL` — your animerewa URL, e.g. `https://project--913413e2-8dc1-44f9-8919-7d86eea427dc.lovable.app`
   - `WORKER_SECRET` — the same value you set in Lovable Cloud secrets
   - `STREAMTAPE_LOGIN` + `STREAMTAPE_KEY` — https://streamtape.com → My Account → API
   - `DOODSTREAM_API_KEY` — https://doodstream.com → My Account → API key
3. **Actions** tab → enable workflows. Done.

▶ Use "Run workflow" to trigger manually.

## Inspect queue

`GET /api/public/scout` → pending/failed counts.

## Limits

- GitHub Actions: unlimited minutes on public repos, 2000/mo on private.
- Disabled legacy workflow.
