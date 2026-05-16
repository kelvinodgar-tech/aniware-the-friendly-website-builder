import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Read-only status endpoint: shows queue state for the GitHub Actions worker.
// The worker itself runs from .github/workflows/ingest.yml — this is purely
// an inspection / debug endpoint and exposes no PII.
export const Route = createFileRoute("/api/public/scout")({
  server: {
    handlers: {
      GET: async () => {
        const { data: pending } = await supabaseAdmin
          .from("ingestion_jobs")
          .select("id, mal_id, episode_number, release_title, status, attempts, created_at")
          .in("status", ["pending", "processing"])
          .order("created_at", { ascending: true })
          .limit(20);
        const { count: pendingCount } = await supabaseAdmin
          .from("ingestion_jobs")
          .select("id", { head: true, count: "exact" })
          .eq("status", "pending");
        const { count: failedCount } = await supabaseAdmin
          .from("ingestion_jobs")
          .select("id", { head: true, count: "exact" })
          .eq("status", "failed");
        return Response.json({
          ok: true,
          pending: pendingCount ?? 0,
          failed: failedCount ?? 0,
          upcoming: pending ?? [],
        });
      },
    },
  },
});
