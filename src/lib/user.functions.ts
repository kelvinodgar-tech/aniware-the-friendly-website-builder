import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const saveProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        malId: z.number().int().positive(),
        episode: z.number().int().positive(),
        position: z.number().int().min(0),
        duration: z.number().int().min(0).optional(),
        completed: z.boolean().optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("watch_progress").upsert(
      {
        user_id: userId,
        mal_id: data.malId,
        episode_number: data.episode,
        position_seconds: data.position,
        duration_seconds: data.duration ?? null,
        completed: data.completed ?? false,
      },
      { onConflict: "user_id,mal_id,episode_number" }
    );
    return { ok: true };
  });

export const getMyWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: rows, error } = await supabaseAdmin
      .from("watchlist")
      .select("mal_id, added_at")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    if (error) throw new Error(error.message);
    const malIds = (rows ?? []).map((r) => r.mal_id);
    if (!malIds.length) return [];
    const { data: anime } = await supabaseAdmin.from("anime_cache").select("*").in("mal_id", malIds);
    const animeById = new Map((anime ?? []).map((a) => [a.mal_id, a]));
    return (rows ?? []).map((r) => ({ ...r, anime: animeById.get(r.mal_id) ?? null }));
  });

export const toggleWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ malId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("watchlist")
      .select("mal_id")
      .eq("user_id", userId)
      .eq("mal_id", data.malId)
      .maybeSingle();
    if (existing) {
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("mal_id", data.malId);
      return { saved: false };
    }
    await supabase.from("watchlist").insert({ user_id: userId, mal_id: data.malId });
    return { saved: true };
  });

export const getMyHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: rows, error } = await supabaseAdmin
      .from("watch_progress")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const malIds = Array.from(new Set((rows ?? []).map((r) => r.mal_id)));
    if (!malIds.length) return [];
    const { data: anime } = await supabaseAdmin.from("anime_cache").select("*").in("mal_id", malIds);
    const animeById = new Map((anime ?? []).map((a) => [a.mal_id, a]));
    return (rows ?? []).map((r) => ({ ...r, anime: animeById.get(r.mal_id) ?? null }));
  });

export const getEpisodeProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ malId: z.number().int().positive(), episode: z.number().int().positive() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("watch_progress")
      .select("position_seconds, duration_seconds, completed, updated_at")
      .eq("user_id", userId)
      .eq("mal_id", data.malId)
      .eq("episode_number", data.episode)
      .maybeSingle();
    return row;
  });

export const getAnimeProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ malId: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("watch_progress")
      .select("episode_number, position_seconds, duration_seconds, completed, updated_at")
      .eq("user_id", userId)
      .eq("mal_id", data.malId)
      .order("updated_at", { ascending: false });
    const latest = rows?.[0] ?? null;
    return { latest, all: rows ?? [] };
  });


export const isMyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data, userId };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      username: z.string().min(2).max(40).regex(/^[a-zA-Z0-9_-]+$/).optional(),
      avatar_url: z.string().url().max(500).nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update(data).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
