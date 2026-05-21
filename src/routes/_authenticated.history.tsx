import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { getMyHistory } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Continue watching — animerewa" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const fn = useServerFn(getMyHistory);
  const q = useQuery({ queryKey: ["history"], queryFn: () => fn() });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-6 flex items-center gap-2">
        <History className="w-7 h-7 text-primary" /> Continue watching
      </h1>
      {q.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground text-center py-20">Nothing watched yet.</p>
      ) : (
        <div className="space-y-3">
          {q.data!.map((h: any) => (
            <Link
              key={`${h.mal_id}-${h.episode_number}`}
              to="/watch/$malId/$episode"
              params={{ malId: String(h.mal_id), episode: String(h.episode_number) }}
              className="flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-accent border border-border/50 transition-all"
            >
              {h.anime?.poster_url && (
                <img src={h.anime.poster_url} alt="" className="w-12 h-16 rounded object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{h.anime?.title_english || h.anime?.title}</div>
                <div className="text-sm text-muted-foreground">Episode {h.episode_number}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
