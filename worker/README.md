# Aniware Ingest Worker

Runs on **GitHub Actions** every 30 minutes. Free. No server needed.

## What it does

1. **scout** — reads SubsPlease 720p RSS from Nyaa, matches releases to top airing anime (Jikan), enqueues missing episodes into `ingestion_jobs`.
2. **ingest** — claims one pending job → `aria2c` downloads the magnet → `ffmpeg` transcodes to 720p MP4 → uploads to Streamtape (primary) + Mp4Upload (fallback) → inserts rows into `media_links` → cleans up.

One episode per run. Re-runs every 30min until queue is empty.

## Setup (one time, ~3 minutes)

1. Push this repo to GitHub (Lovable → GitHub → Connect).
2. On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Add:
   - `SUPABASE_URL` — already in your `.env`
   - `SUPABASE_SERVICE_ROLE_KEY` — Lovable Cloud → Backend → API keys → service_role
   - `STREAMTAPE_LOGIN` + `STREAMTAPE_KEY` — https://streamtape.com → My Account → API
   - `MP4UPLOAD_USER` + `MP4UPLOAD_PASS` — https://www.mp4upload.com → register → API
3. **Actions** tab → enable workflows. Done.

You can also hit ▶ **Run workflow** to trigger manually.

## Inspect queue

`GET /api/public/scout` returns pending + failed job counts.

## Limits

- GitHub Actions: **unlimited minutes on public repos**, 2000/mo on private.
- One job per 30min run = ~48 episodes/day max throughput.
- 6h job cap (we set 330min) is plenty for a single 720p episode.
