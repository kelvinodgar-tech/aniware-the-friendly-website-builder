import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  jikanByGenre,
  jikanDetails,
  jikanGenres,
  jikanSchedule,
  jikanSearch,
  jikanSeasonNow,
  jikanTop,
  toAnimeRow,
} from "@/lib/jikan";
import { detectFailureFromHtml, detectProvider } from "@/lib/providers";

// 24h cache
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function cacheAnime(malId: number) {
  const { data: existing } = await supabaseAdmin
    .from("anime_cache")
    .select("*")
    .eq("mal_id", malId)
    .maybeSingle();
  if (existing && Date.now() - new Date(existing.updated_at).getTime() < CACHE_TTL_MS) {
    return existing;
  }
  const fresh = await jikanDetails(malId);
  const row = toAnimeRow(fresh);
  const { data } = await supabaseAdmin
    .from("anime_cache")
    .upsert(row, { onConflict: "mal_id" })
    .select()
    .single();
  return data ?? row;
}

export const getTrending = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const top = await jikanTop(18);
    return top.map(toAnimeRow);
  } catch (e) {
    console.error("getTrending failed", e);
    return [];
  }
});

export const getSeasonNow = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const list = await jikanSeasonNow(18);
    return list.map(toAnimeRow);
  } catch (e) {
    console.error("getSeasonNow failed", e);
    return [];
  }
});

export const searchAnime = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ query: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const list = await jikanSearch(data.query);
      return list.map(toAnimeRow);
    } catch (e) {
      console.error("searchAnime failed", e);
      return [];
    }
  });

export const listGenres = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const list = await jikanGenres();
    return list.sort((a, b) => b.count - a.count);
  } catch (e) {
    console.error("listGenres failed", e);
    return [];
  }
});

export const animeByGenre = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ genreId: z.number().int().positive(), page: z.number().int().min(1).max(20).default(1) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const list = await jikanByGenre(data.genreId, data.page);
      return list.map(toAnimeRow);
    } catch (e) {
      console.error("animeByGenre failed", e);
      return [];
    }
  });

export const getSchedule = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ day: z.enum(["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const list = await jikanSchedule(data.day);
      return list.map(toAnimeRow);
    } catch (e) {
      console.error("getSchedule failed", e);
      return [];
    }
  });

export const getAnimeDetails = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ malId: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => {
    const anime = await cacheAnime(data.malId);
    // Episodes are auto-provisioned on demand by getEpisodeSources, so just
    // list 1..N from the metadata. Fall back to 12 if Jikan doesn't know.
    const total = anime.episodes && anime.episodes > 0 ? anime.episodes : 12;
    const availableEpisodes = Array.from({ length: total }, (_, i) => i + 1);
    return { anime, availableEpisodes };
  });

// Free iframe providers that accept MAL id + episode number directly.
// No torrenting, no API keys. Player just embeds the iframe.
function buildAutoSources(malId: number, episode: number) {
  return [
    { server_name: "vidsrc", quality: "720p", language: "sub", priority: 10,
      embed_url: `https://vidsrc.cc/v2/embed/anime/ani${malId}/${episode}/sub` },
    { server_name: "vidsrc", quality: "720p", language: "dub", priority: 15,
      embed_url: `https://vidsrc.cc/v2/embed/anime/ani${malId}/${episode}/dub` },
    { server_name: "2embed", quality: "720p", language: "sub", priority: 20,
      embed_url: `https://2embed.cc/embed/anime/${malId}/${episode}/sub` },
    { server_name: "2embed", quality: "720p", language: "dub", priority: 25,
      embed_url: `https://2embed.cc/embed/anime/${malId}/${episode}/dub` },
    { server_name: "miruro", quality: "720p", language: "sub", priority: 30,
      embed_url: `https://www.miruro.tv/watch?id=${malId}&ep=${episode}` },
  ];
}

export const getEpisodeSources = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ malId: z.number().int().positive(), episode: z.number().int().positive() })
      .parse(d)
  )
  .handler(async ({ data }) => {
    const anime = await cacheAnime(data.malId);

    let { data: links } = await supabaseAdmin
      .from("media_links")
      .select("*")
      .eq("mal_id", data.malId)
      .eq("episode_number", data.episode)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // Auto-provision iframe sources on first request — free, on-demand.
    if (!links || links.length === 0) {
      const rows = buildAutoSources(data.malId, data.episode).map((r) => ({
        ...r,
        mal_id: data.malId,
        episode_number: data.episode,
      }));
      const { data: inserted } = await supabaseAdmin
        .from("media_links")
        .insert(rows)
        .select();
      links = inserted ?? rows as any;
    }

    return { anime, sources: links ?? [] };
  });

// --- Admin: media links CRUD ---
const linkSchema = z.object({
  id: z.string().uuid().optional(),
  mal_id: z.number().int().positive(),
  episode_number: z.number().int().positive(),
  server_name: z.string().min(1).max(40),
  quality: z.enum(["480p", "720p", "1080p"]).default("720p"),
  embed_url: z.string().url(),
  direct_download_url: z.string().url().nullable().optional(),
  subtitle_url: z.string().url().nullable().optional(),
  language: z.enum(["sub", "dub"]).default("sub"),
  priority: z.number().int().min(1).max(1000).default(100),
});

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin required");
}

export const upsertMediaLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => linkSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // ensure anime cached
    await cacheAnime(data.mal_id).catch(() => null);
    const payload = { ...data, server_name: detectProvider(data.embed_url) === "generic" ? data.server_name : detectProvider(data.embed_url) };
    const { data: row, error } = await supabaseAdmin
      .from("media_links")
      .upsert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteMediaLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("media_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllMediaLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("media_links")
      .select("*")
      .order("mal_id", { ascending: false })
      .order("episode_number", { ascending: true })
      .limit(500);
    return data ?? [];
  });

// --- Health check ---
async function probeUrl(url: string, provider: ReturnType<typeof detectProvider>) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 AniwareHealthBot" },
    });
    const html = await res.text();
    if (!res.ok) return { healthy: false, reason: `http-${res.status}` };
    const reason = detectFailureFromHtml(provider, html);
    return reason ? { healthy: false, reason } : { healthy: true, reason: null };
  } catch (e: any) {
    return { healthy: false, reason: e?.name === "AbortError" ? "timeout" : "fetch-error" };
  } finally {
    clearTimeout(t);
  }
}

async function updateHealth(id: string, healthy: boolean, reason: string | null) {
  const now = new Date().toISOString();
  const { data: cur } = await supabaseAdmin
    .from("media_links")
    .select("retry_count, health_score")
    .eq("id", id)
    .single();
  const retry = healthy ? 0 : (cur?.retry_count ?? 0) + 1;
  const score = healthy
    ? Math.min(100, (cur?.health_score ?? 100) + 10)
    : Math.max(0, (cur?.health_score ?? 100) - 25);
  await supabaseAdmin
    .from("media_links")
    .update({
      status: healthy ? "healthy" : "broken",
      last_checked_at: now,
      last_failed_at: healthy ? null : now,
      retry_count: retry,
      health_score: score,
      is_active: score > 0,
    })
    .eq("id", id);
  return { healthy, reason, score };
}

export const checkOneLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: link } = await supabaseAdmin
      .from("media_links")
      .select("*")
      .eq("id", data.id)
      .single();
    if (!link) throw new Error("Not found");
    const provider = detectProvider(link.embed_url);
    const probe = await probeUrl(link.embed_url, provider);
    return updateHealth(link.id, probe.healthy, probe.reason);
  });

export const batchHealthCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return runHealthBatch();
  });

// Shared batch runner (no auth) — called by /api/public/health-check cron
export async function runHealthBatch(limit = 25) {
  const { data: stale } = await supabaseAdmin
    .from("media_links")
    .select("*")
    .or(
      `last_checked_at.is.null,last_checked_at.lt.${new Date(Date.now() - 6 * 3600 * 1000).toISOString()}`
    )
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const results: Array<{ id: string; healthy: boolean; reason: string | null }> = [];
  for (const link of stale ?? []) {
    const provider = detectProvider(link.embed_url);
    const probe = await probeUrl(link.embed_url, provider);
    await updateHealth(link.id, probe.healthy, probe.reason);
    results.push({ id: link.id, healthy: probe.healthy, reason: probe.reason });
  }
  return { checked: results.length, results };
}
