// Public cron endpoint that advances the Anikoto background sync.
// Idempotent and rate-limit-aware: pulls a small batch of pages,
// upserts mappings + refreshes episodes for known animes, then
// persists the cursor so the next tick resumes exactly where this paused.
import { createFileRoute } from "@tanstack/react-router";
import { runAnikotoSync } from "@/lib/anikoto-sync.server";

async function handle() {
  try {
    const result = await runAnikotoSync(6);
    return Response.json({ ok: true, ...result });
  } catch (e: any) {
    console.error("[sync-anikoto] failed", e);
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/sync-anikoto")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
