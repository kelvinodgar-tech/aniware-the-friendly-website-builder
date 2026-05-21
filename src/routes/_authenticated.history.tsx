import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { History, Play } from "lucide-react";
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
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Nothing watched yet — start an episode and we'll keep your spot.</p>
          <Link to="/browse" className="text-primary hover:underline">Browse anime →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {q.data!.map((h: any) => {
            const pos = h.position_seconds ?? 0;
            const dur = h.duration_seconds ?? 0;
            const pct = dur > 0 ? Math.min(100, Math.round((pos / dur) * 100)) : (h.completed ? 100 : 5);
            return (
              <Link
                key={`${h.mal_id}-${h.episode_number}`}
                to="/watch/$malId/$episode"
                params={{ malId: String(h.mal_id), episode: String(h.episode_number) }}
                className="group flex items-center gap-4 p-3 rounded-xl bg-surface hover:bg-accent border border-border/50 transition-colors"
              >
                {h.anime?.poster_url && (
                  <img src={h.anime.poster_url} alt="" loading="lazy" className="w-14 h-20 rounded-md object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate group-hover:text-primary transition-colors">
                    {h.anime?.title_english || h.anime?.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Episode {h.episode_number}{h.completed ? " · watched" : ""}
                  </div>
                  <div className="mt-2 h-1 bg-border/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
