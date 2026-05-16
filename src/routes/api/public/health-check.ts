import { createFileRoute } from "@tanstack/react-router";
import { runHealthBatch } from "@/lib/anime.functions";

// Public endpoint for cron-driven provider health checks.
// Call from pg_cron with the project's anon `apikey` header.
export const Route = createFileRoute("/api/public/health-check")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const r = await runHealthBatch(25);
          return Response.json({ ok: true, ...r });
        } catch (e: any) {
          return Response.json({ ok: false, error: e?.message ?? "unknown" }, { status: 500 });
        }
      },
    },
  },
});
