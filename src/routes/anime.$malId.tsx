import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Play, Star, Calendar, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnimeDetails } from "@/lib/anime.functions";
import { toggleWatchlist, getMyWatchlist } from "@/lib/user.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/anime/$malId")({
  head: ({ params }) => ({
    meta: [
      { title: `Anime #${params.malId} — Aniware` },
      { name: "description", content: "Watch episodes, read details, and add to your list on Aniware." },
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

  const toggle = useMutation({
    mutationFn: () => toggleFn({ data: { malId: id } }),
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

  return (
    <div>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-hero" />
        {anime.poster_url && (
          <div className="absolute inset-0 opacity-30">
            <img src={anime.poster_url} alt="" className="w-full h-full object-cover blur-3xl scale-110" />
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
            <div className="mt-6 flex gap-3">
              {availableEpisodes[0] && (
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
                  <Link to="/watch/$malId/$episode" params={{ malId, episode: String(availableEpisodes[0]) }}>
                    <Play className="w-4 h-4 mr-2" /> Watch episode {availableEpisodes[0]}
                  </Link>
                </Button>
              )}
              {user && (
                <Button size="lg" variant={inList ? "default" : "outline"} onClick={() => toggle.mutate()}>
                  <Heart className={`w-4 h-4 mr-2 ${inList ? "fill-current" : ""}`} />
                  {inList ? "In list" : "Add to list"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold mb-6">Episodes</h2>
        {epList.length === 0 ? (
          <p className="text-muted-foreground">No episodes listed.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {epList.map((ep) => {
              const has = available.has(ep);
              return has ? (
                <Link
                  key={ep}
                  to="/watch/$malId/$episode"
                  params={{ malId, episode: String(ep) }}
                  className="group relative aspect-square rounded-lg bg-surface hover:bg-primary border border-border/50 hover:border-primary flex items-center justify-center text-sm font-semibold transition-all"
                >
                  {ep}
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success" />
                </Link>
              ) : (
                <div
                  key={ep}
                  className="aspect-square rounded-lg bg-surface/40 border border-border/30 flex items-center justify-center text-sm text-muted-foreground/50 cursor-not-allowed"
                  title="Not available yet"
                >
                  {ep}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
