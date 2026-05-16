import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    await supabase.from("watch_progress").upsert({
      user_id: userId,
      mal_id: data.malId,
      episode_number: data.episode,
      position_seconds: data.position,
      duration_seconds: data.duration ?? null,
      completed: data.completed ?? false,
    });
    return { ok: true };
  });

export const getMyWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("watchlist")
      .select("mal_id, added_at, anime:anime_cache(*)")
      .eq("user_id", userId)
      .order("added_at", { ascending: false });
    return data ?? [];
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
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("watch_progress")
      .select("*, anime:anime_cache(*)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    return data ?? [];
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
