// Server-only helpers for syncing Anikoto catalog + episodes into our DB.
// Not safe to import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { anikotoRecentPage, anikotoSeries, type AnikotoListItem } from "@/lib/anikoto";

export const ANIKOTO = "anikoto";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Upsert all episodes of a series into media_links. Returns count. */
export async function refreshSeriesEpisodes(malId: number, externalId: string | number) {
  const series = await anikotoSeries(externalId);
  const rows: Array<{
    mal_id: number;
    episode_number: number;
    server_name: string;
    quality: string;
    embed_url: string;
    language: string;
    priority: number;
    is_active: boolean;
    status: string;
  }> = [];
  for (const ep of series.episodes ?? []) {
    for (const lang of ["sub", "dub"] as const) {
      const url = ep.embed_url?.[lang];
      if (!url) continue;
      rows.push({
        mal_id: malId,
        episode_number: ep.number,
        server_name: "anikoto",
        quality: "720p",
        embed_url: url,
        language: lang,
        priority: lang === "sub" ? 8 : 9,
        is_active: true,
        status: "healthy",
      });
    }
  }
  if (!rows.length) return 0;
  const { error } = await supabaseAdmin
    .from("media_links")
    .upsert(rows, { onConflict: "mal_id,episode_number,server_name,language" });
  if (error) {
    console.error("[anikoto-sync] media_links upsert failed", error.message);
    return 0;
  }
  return rows.length;
}

/**
 * Process up to `maxPages` pages of Anikoto's recent-anime feed.
 * - Upserts provider_map for every entry with a mal_id.
 * - For known animes whose episode count grew (or are in media_links already),
 *   refreshes their episodes so new releases land automatically.
 * - On rate-limit (429), the underlying client already retries with backoff.
 *   If retries are exhausted, we save the cursor and stop gracefully.
 * - Resumes from the saved cursor; wraps to page 1 on full pass.
 */
export async function runAnikotoSync(maxPages = 6) {
  const { data: state } = await supabaseAdmin
    .from("sync_state")
    .select("*")
    .eq("provider", ANIKOTO)
    .maybeSingle();

  let cursor = state?.cursor_page ?? 1;
  let totalPages = state?.total_pages ?? null;
  let pagesProcessed = 0;
  let mappingsUpserted = 0;
  let seriesRefreshed = 0;
  let lastError: string | null = null;
  let wrapped = false;

  for (let i = 0; i < maxPages; i++) {
    let res;
    try {
      res = await anikotoRecentPage(cursor, 100);
    } catch (e: any) {
      lastError = String(e?.message ?? e);
      console.error(`[anikoto-sync] page ${cursor} failed:`, lastError);
      break;
    }
    totalPages = res.pagination?.total_pages ?? totalPages;
    const items: AnikotoListItem[] = res.data ?? [];

    const mapRows = items
      .filter((r) => r.mal_id)
      .map((r) => ({
        provider: ANIKOTO,
        mal_id: Number(r.mal_id),
        external_id: String(r.id),
        slug: r.slug ?? null,
        total_episodes: r.episodes ? Number(r.episodes) || null : null,
      }));

    if (mapRows.length) {
      // Fetch existing rows so we can detect new episodes for known animes.
      const malIds = mapRows.map((r) => r.mal_id);
      const { data: existingMap } = await supabaseAdmin
        .from("provider_map")
        .select("mal_id, total_episodes")
        .eq("provider", ANIKOTO)
        .in("mal_id", malIds);
      const prevByMal = new Map((existingMap ?? []).map((m) => [m.mal_id, m.total_episodes]));

      const { data: existingLinks } = await supabaseAdmin
        .from("media_links")
        .select("mal_id")
        .in("mal_id", malIds);
      const hasLinks = new Set((existingLinks ?? []).map((l) => l.mal_id));

      await supabaseAdmin
        .from("provider_map")
        .upsert(mapRows, { onConflict: "provider,mal_id" });
      mappingsUpserted += mapRows.length;

      // Refresh series episodes when:
      //  - new episodes appeared (current total > previous total), OR
      //  - the anime already has media_links (user accessed it) — keep it fresh.
      // Skip never-accessed new animes; they'll be lazy-fetched on first request.
      for (const row of mapRows) {
        const prev = prevByMal.get(row.mal_id) ?? null;
        const grew = row.total_episodes != null && prev != null && row.total_episodes > prev;
        const accessed = hasLinks.has(row.mal_id);
        if (!grew && !accessed) continue;
        try {
          const n = await refreshSeriesEpisodes(row.mal_id, row.external_id);
          if (n) seriesRefreshed++;
          // gentle pacing between series fetches to stay under rate limit
          await sleep(400);
        } catch (e) {
          console.warn(`[anikoto-sync] refresh mal=${row.mal_id} failed`, e);
        }
      }
    }

    pagesProcessed++;
    cursor = cursor + 1;
    if (totalPages && cursor > totalPages) {
      cursor = 1;
      wrapped = true;
      break; // finish pass; next cron tick starts a new one
    }
    // light pacing between page fetches
    await sleep(800);
  }

  await supabaseAdmin
    .from("sync_state")
    .upsert(
      {
        provider: ANIKOTO,
        cursor_page: cursor,
        total_pages: totalPages,
        last_run_at: new Date().toISOString(),
        last_full_pass_at: wrapped ? new Date().toISOString() : state?.last_full_pass_at ?? null,
        last_error: lastError,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider" }
    );

  return {
    pagesProcessed,
    mappingsUpserted,
    seriesRefreshed,
    nextCursor: cursor,
    totalPages,
    wrapped,
    lastError,
  };
}
