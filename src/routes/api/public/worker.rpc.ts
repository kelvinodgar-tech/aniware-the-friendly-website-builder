// Shared-secret RPC for the GitHub Actions worker.
// Avoids needing the Supabase service role key in CI by proxying
// all privileged DB ops through this endpoint, authenticated with
// WORKER_SECRET (a runtime secret we both know).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const claimSchema = z.object({ action: z.literal("claim") });

const completeSchema = z.object({
  action: z.literal("complete"),
  jobId: z.string().uuid(),
  links: z
    .array(
      z.object({
        mal_id: z.number().int().positive(),
        episode_number: z.number().int().positive(),
        server_name: z.string().min(1).max(40),
        quality: z.string().min(2).max(10),
        embed_url: z.string().url(),
        direct_download_url: z.string().url().nullable().optional(),
        priority: z.number().int().min(1).max(1000).default(100),
      })
    )
    .min(1)
    .max(10),
});

const failSchema = z.object({
  action: z.literal("fail"),
  jobId: z.string().uuid(),
  error: z.string().max(500),
  attempts: z.number().int().min(0),
});

const enqueueSchema = z.object({
  action: z.literal("enqueue"),
  jobs: z
    .array(
      z.object({
        mal_id: z.number().int().positive(),
        episode_number: z.number().int().positive(),
        release_title: z.string().max(300),
        release_group: z.string().max(80).optional(),
        magnet: z.string().startsWith("magnet:").max(4000),
        quality: z.string().max(10).default("720p"),
      })
    )
    .max(50),
});

const bodySchema = z.discriminatedUnion("action", [
  claimSchema,
  completeSchema,
  failSchema,
  enqueueSchema,
]);

export const Route = createFileRoute("/api/public/worker/rpc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.WORKER_SECRET;
        if (!secret) return Response.json({ ok: false, error: "server-misconfigured" }, { status: 500 });
        const got = request.headers.get("x-worker-secret");
        if (!got || got !== secret) {
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        }

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch (e: any) {
          return Response.json({ ok: false, error: "bad-input", detail: e?.message }, { status: 400 });
        }

        try {
          if (parsed.action === "claim") {
            const { data: pending } = await supabaseAdmin
              .from("ingestion_jobs")
              .select("*")
              .eq("status", "pending")
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (!pending) return Response.json({ ok: true, job: null });
            const { data: locked } = await supabaseAdmin
              .from("ingestion_jobs")
              .update({
                status: "processing",
                locked_at: new Date().toISOString(),
                attempts: pending.attempts + 1,
              })
              .eq("id", pending.id)
              .eq("status", "pending")
              .select()
              .maybeSingle();
            return Response.json({ ok: true, job: locked });
          }

          if (parsed.action === "complete") {
            const { error: linkErr } = await supabaseAdmin
              .from("media_links")
              .insert(parsed.links);
            if (linkErr) throw linkErr;
            await supabaseAdmin
              .from("ingestion_jobs")
              .update({ status: "done" })
              .eq("id", parsed.jobId);
            return Response.json({ ok: true });
          }

          if (parsed.action === "fail") {
            await supabaseAdmin
              .from("ingestion_jobs")
              .update({
                status: parsed.attempts >= 3 ? "failed" : "pending",
                last_error: parsed.error,
              })
              .eq("id", parsed.jobId);
            return Response.json({ ok: true });
          }

          // enqueue (scout)
          let enqueued = 0;
          for (const j of parsed.jobs) {
            const { data: link } = await supabaseAdmin
              .from("media_links")
              .select("id")
              .eq("mal_id", j.mal_id)
              .eq("episode_number", j.episode_number)
              .maybeSingle();
            if (link) continue;
            const { data: existing } = await supabaseAdmin
              .from("ingestion_jobs")
              .select("id")
              .eq("mal_id", j.mal_id)
              .eq("episode_number", j.episode_number)
              .in("status", ["pending", "processing", "done"])
              .maybeSingle();
            if (existing) continue;
            const { error } = await supabaseAdmin.from("ingestion_jobs").insert(j);
            if (!error) enqueued++;
          }
          return Response.json({ ok: true, enqueued });
        } catch (e: any) {
          console.error("[worker.rpc] error", e);
          return Response.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
        }
      },
    },
  },
});
