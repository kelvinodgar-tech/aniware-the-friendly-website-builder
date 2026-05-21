## Plan: animerewa rebrand + cleanup + fixes

This is a large set of changes, grouped so we can ship them safely in one pass.

### 1. Rebrand to **animerewa**
- Replace "Aniware" everywhere (header, footer, copy, JSON-LD, og:site_name, page titles).
- New anime-themed logo + favicon (generated PNG, used in `<link rel="icon">` and as logo component).
- New OG/Twitter share image (1200×630, anime-styled, with "animerewa" wordmark).
- Update `__root.tsx` head defaults: title template, og:site_name, og:image, twitter:image, structured data.

### 2. Remove the download page
- Delete `src/routes/download.$malId.$episode.tsx` (and route from `routeTree.gen.ts` regeneration).
- Remove "Download" button from watch page and any links pointing to it.
- Remove ingestion/torrent leftovers from copy: Streamtape, DoodStream, magnet/torrent mentions (UI strings only, not the historical `ingestion_jobs` table — that we just leave dormant).

### 3. Watch page: dub/sub + seamless switching
- Group mirrors by language; show **SUB / DUB** as a segmented control (only languages that have a mirror are shown).
- The server dropdown shows the provider label (e.g. "Anikoto") without changing language.
- Switching server within the **same language** swaps the iframe `src` only — no remount of surrounding chrome. Changing language naturally reloads (different stream).
- Resume banner already exists; keep it, but ensure the marker writes only once per (episode,language) so changing dub/sub doesn't double-count.

### 4. Fix Watchlist + Continue Watching UX
- Watchlist toggle: optimistic update, toast on add/remove, button state flips immediately ("In watchlist ✓" vs "+ Watchlist"). Invalidate the `["watchlist"]` query so `/watchlist` reflects changes instantly.
- Continue Watching: surface a row on the home page from `watch_progress` joined with `anime_cache`. Show poster, last episode, progress bar, "Resume" CTA → `/watch/$malId/$episode`.
- Verify `saveProgress` upsert key (already `user_id,mal_id,episode_number`) and that the heartbeat actually fires for iframe players too (it currently only fires for direct/HLS). For iframes we keep the "episode-level" marker — that's the best we can do cross-origin.

### 5. Catalog hygiene — drop irrelevant entries
- Anything in `anime_cache` that has no provider_map row AND no media_links is junk from older Jikan scout passes. Migration: delete those rows.
- Tighten the Jikan scout / search path to only cache results that have a MAL id and at least one of (year ≥ 2000, score ≥ 6, popularity rank set) — prevents "Adventure of Gamba" style noise.
- Make sure browse/search reads filter to anime that actually have media_links OR a provider_map entry, so the visible catalog == what we can play.

### 6. Background sync still healthy
- Verify `sync_state` cursor is advancing; if `last_run_at` is stale we re-trigger once and confirm the cron is wired.
- No code change unless the cron drifted; just confirm in this turn.

### 7. Perf — fix sluggish scroll
- Audit `backdrop-blur` usage on header / cards. Replace with solid `bg-background/90` + `border-b` and use `text-shadow` where readability over busy backgrounds matters.
- Add `content-visibility: auto` to long lists (episode grid, browse grid).
- Lazy-load anime poster images (`loading="lazy"`, `decoding="async"`).
- Drop any framer-motion on scroll-mounted decorative pieces.

### 8. Remove "sparkles" / AI patterns
- Remove decorative `Sparkles` icon usages and gradient "AI shimmer" backgrounds. Keep the gradient brand accents on CTAs.

### 9. Episode grid redesign
- Replace current list with a compact responsive grid: numbered tiles, current episode highlighted, watched tiles dimmed with a check, hover shows title if available. Virtualize if > 100 episodes.

### 10. "Proxy the database to cloak it"
- The Supabase URL + anon key are already shipped in the client bundle (this is by design — RLS is the security boundary). We will:
  - Audit RLS so **no** table is readable without the policies it needs (already mostly the case — confirm `anime_cache`, `media_links`, `provider_map`, `sync_state` are intentional public reads; everything else requires auth).
  - Route reads through server functions (`createServerFn`) for the pages that don't need realtime, so the browser hits `/api/...` instead of `*.supabase.co`. The anon key still exists but the network tab no longer shows the Supabase host for normal browsing.
  - We will NOT build a full reverse proxy of `*.supabase.co` — that's a multi-day project and would break auth/realtime. If you want full hostname cloaking later, we'd set up a Cloudflare Worker in front of the project subdomain.

### 11. SEO
- After the rebrand lands, per-route `head()` already exists; update titles/descriptions to "animerewa" wording.
- Trigger an SEO scan at the end and point you at the results panel.

### Technical notes
- All UI tokens stay in `src/styles.css` (semantic tokens, no hardcoded colors in components).
- New logo + OG image are generated PNGs committed to `src/assets/` (logo) and `public/` (favicon + og-image).
- Watchlist/resume hooks use TanStack Query's `invalidateQueries` for instant UI feedback.

### Anime test set (after sync)
I'll send 3 titles for you to spot-check once the changes ship.

---

**This plan is big — do you want me to execute the whole thing, or trim it?** Common trims:
- Skip #10 (DB proxying) for now since the anon key is already RLS-safe.
- Defer the OG/Twitter image regeneration if you want to provide your own art.
- Defer episode-grid virtualization until we see a series that actually has > 100 eps in the cache.