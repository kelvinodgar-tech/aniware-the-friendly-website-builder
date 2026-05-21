import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Play, Star, Calendar, Film, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnimeDetails } from "@/lib/anime.functions";
import { toggleWatchlist, getMyWatchlist, getAnimeProgress } from "@/lib/user.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/anime/$malId")({
  head: ({ params }) => ({
    meta: [
      { title: `Anime #${params.malId} — animerewa` },
      { name: "description", content: "Watch episodes, read details, and add to your list on animerewa." },
    ],
  }),
  component: AnimePage,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
});

function AnimePage() {
  const { malId } = Route.useParams();
  const id = Number(malId);
  if (!id) throw notFound();
  const { user } = useAuth();
  const qc = useQueryClient();
  const detailsFn = useServerFn(getAnimeDetails);
  const toggleFn = useServerFn(toggleWatchlist);
  const myListFn = useServerFn(getMyWatchlist);
  const progressFn = useServerFn(getAnimeProgress);

  const q = useQuery({
    queryKey: ["anime", id],
    queryFn: () => detailsFn({ data: { malId: id } }),
  });

  const myList = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => myListFn(),
    enabled: !!user,
  });
  const inList = myList.data?.some((w) => w.mal_id === id) ?? false;

  const progress = useQuery({
    queryKey: ["anime-progress", id, user?.id ?? null],
    queryFn: () => progressFn({ data: { malId: id } }),
    enabled: !!user,
  });

  const toggle = useMutation({
    mutationFn: () => toggleFn({ data: { malId: id } }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["watchlist"] });
      const prev = qc.getQueryData<any[]>(["watchlist"]);
      // Optimistic: add a placeholder if not in list, remove if it is.
      if (inList) {
        qc.setQueryData<any[]>(["watchlist"], (old) => (old ?? []).filter((w) => w.mal_id !== id));
      } else if (q.data?.anime) {
        qc.setQueryData<any[]>(["watchlist"], (old) => [{ mal_id: id, added_at: new Date().toISOString(), anime: q.data!.anime }, ...(old ?? [])]);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev);
      toast.error("Couldn't update your list");
    },
    onSuccess: (r) => {
      toast.success(r.saved ? "Added to watchlist" : "Removed from watchlist");
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  if (q.isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }
  if (!q.data) return null;
  const { anime, availableEpisodes } = q.data;
  const totalEps = anime.episodes ?? Math.max(availableEpisodes.length, 12);
  const epList = Array.from({ length: totalEps }, (_, i) => i + 1);
  const available = new Set(availableEpisodes);
  const watched = new Map<number, { completed: boolean; position: number; duration: number }>();
  for (const row of progress.data?.all ?? []) {
    watched.set(row.episode_number, {
      completed: !!row.completed,
      position: row.position_seconds ?? 0,
      duration: row.duration_seconds ?? 0,
    });
  }
  const resumeEp = progress.data?.latest?.episode_number;
  const watchTarget = resumeEp ?? availableEpisodes[0];

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-hero" />
        {anime.poster_url && (
          <div className="absolute inset-0 opacity-20">
            <img src={anime.poster_url} alt="" className="w-full h-full object-cover scale-110" style={{ filter: "blur(40px)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="container mx-auto px-4 relative py-12 grid md:grid-cols-[260px_1fr] gap-8">
          {anime.poster_url && (
            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-glow border border-border/40 max-w-[260px]">
              <img src={anime.poster_url} alt={anime.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              {anime.title_english || anime.title}
            </h1>
            {anime.title_japanese && (
              <p className="mt-1 text-muted-foreground">{anime.title_japanese}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {anime.score && <Badge variant="secondary"><Star className="w-3 h-3 mr-1 fill-warning text-warning" />{Number(anime.score).toFixed(1)}</Badge>}
              {anime.year && <Badge variant="secondary"><Calendar className="w-3 h-3 mr-1" />{anime.year}</Badge>}
              {anime.episodes && <Badge variant="secondary"><Film className="w-3 h-3 mr-1" />{anime.episodes} eps</Badge>}
              {anime.status && <Badge variant="outline">{anime.status}</Badge>}
              {(anime.genres as string[] | null)?.slice(0, 4).map((g) => (
                <Badge key={g} variant="outline" className="border-primary/40 text-primary">{g}</Badge>
              ))}
            </div>
            <p className="mt-6 text-muted-foreground max-w-3xl line-clamp-5">{anime.synopsis}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {watchTarget && (
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
                  <Link to="/watch/$malId/$episode" params={{ malId, episode: String(watchTarget) }}>
                    <Play className="w-4 h-4 mr-2" />
                    {resumeEp ? `Resume episode ${resumeEp}` : `Watch episode ${watchTarget}`}
                  </Link>
                </Button>
              )}
              {user && (
                <Button
                  size="lg"
                  variant={inList ? "default" : "outline"}
                  onClick={() => toggle.mutate()}
                  disabled={toggle.isPending}
                  className={inList ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30" : ""}
                >
                  <Heart className={`w-4 h-4 mr-2 ${inList ? "fill-current" : ""}`} />
                  {inList ? "In your list" : "Add to list"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">Episodes</h2>
          <div className="text-sm text-muted-foreground">
            {availableEpisodes.length} of {totalEps} available
          </div>
        </div>
        {epList.length === 0 ? (
          <p className="text-muted-foreground">No episodes listed.</p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 [content-visibility:auto]">
            {epList.map((ep) => {
              const has = available.has(ep);
              const w = watched.get(ep);
              const isResume = ep === resumeEp;
              if (!has) {
                return (
                  <div
                    key={ep}
                    className="aspect-square rounded-lg bg-surface/30 border border-border/20 flex items-center justify-center text-sm text-muted-foreground/40 cursor-not-allowed"
                    title="Not available yet"
                  >
                    {ep}
                  </div>
                );
              }
              return (
                <Link
                  key={ep}
                  to="/watch/$malId/$episode"
                  params={{ malId, episode: String(ep) }}
                  className={[
                    "relative aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all border",
                    isResume
                      ? "bg-gradient-primary text-primary-foreground border-primary shadow-glow"
                      : w?.completed
                      ? "bg-surface/60 text-muted-foreground border-border/40 hover:border-primary hover:text-foreground"
                      : "bg-surface text-foreground border-border/50 hover:bg-primary hover:border-primary hover:text-primary-foreground",
                  ].join(" ")}
                  title={isResume ? "Resume here" : w?.completed ? "Watched" : `Episode ${ep}`}
                >
                  {ep}
                  {w?.completed && !isResume && (
                    <Check className="absolute top-1 right-1 w-3 h-3 text-success" />
                  )}
                  {isResume && (
                    <Play className="absolute top-1 right-1 w-3 h-3 fill-current" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
