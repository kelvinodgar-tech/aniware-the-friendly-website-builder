import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, TrendingUp, Calendar, History as HistoryIcon } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSeasonNow, getTrending } from "@/lib/anime.functions";
import { getMyHistory } from "@/lib/user.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "animerewa — Stream & track anime" },
      { name: "description", content: "Browse trending and seasonal anime, save favorites, and stream sub or dub from one place." },
      { property: "og:title", content: "animerewa — Stream & track anime" },
      { property: "og:description", content: "Browse trending and seasonal anime — sub and dub." },
    ],
  }),
  component: Home,
});

function Row({ title, icon, items, loading }: { title: string; icon: React.ReactNode; items: any[]; loading: boolean }) {
  return (
    <section className="mt-12">
      <div className="container mx-auto px-4 flex items-end justify-between mb-5">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="text-primary">{icon}</span>{title}
        </h2>
      </div>
      <div className="container mx-auto px-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[2/3] rounded-xl" />
                <Skeleton className="h-4 mt-3 w-3/4" />
                <Skeleton className="h-3 mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 [content-visibility:auto]">
            {items.slice(0, 12).map((a) => <AnimeCard key={a.mal_id} a={a} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ContinueWatching() {
  const { user } = useAuth();
  const fn = useServerFn(getMyHistory);
  const q = useQuery({
    queryKey: ["history"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 30_000,
  });
  if (!user || (q.data?.length ?? 0) === 0) return null;
  // Deduplicate by anime (keep most recent ep)
  const seen = new Set<number>();
  const items = (q.data ?? []).filter((h: any) => {
    if (seen.has(h.mal_id)) return false;
    seen.add(h.mal_id);
    return !!h.anime;
  }).slice(0, 6);
  if (!items.length) return null;
  return (
    <section className="mt-12">
      <div className="container mx-auto px-4 flex items-end justify-between mb-5">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <span className="text-primary"><HistoryIcon className="w-5 h-5 inline" /></span>
          Continue watching
        </h2>
        <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">View all →</Link>
      </div>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((h: any) => {
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
                  <div className="text-xs text-muted-foreground mt-1">Episode {h.episode_number}</div>
                  <div className="mt-2 h-1 bg-border/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Play className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Home() {
  const trendingFn = useServerFn(getTrending);
  const seasonFn = useServerFn(getSeasonNow);
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => trendingFn(), staleTime: 5 * 60_000 });
  const season = useQuery({ queryKey: ["season"], queryFn: () => seasonFn(), staleTime: 5 * 60_000 });

  const hero = trending.data?.[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        {hero?.poster_url && (
          <div className="absolute inset-0 opacity-20">
            <img src={hero.poster_url} alt="" className="w-full h-full object-cover scale-110" style={{ filter: "blur(40px)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="container mx-auto px-4 relative pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-xs font-medium text-primary mb-6">
              Featured today
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-balance">
              {hero?.title_english || hero?.title || "Discover the next show you'll obsess over."}
            </h1>
            <p className="mt-5 text-muted-foreground text-lg max-w-xl line-clamp-3">
              {hero?.synopsis ||
                "Browse trending and seasonal anime, save favorites, and stream sub or dub — all in one polished hub."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero && (
                <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
                  <Link to="/anime/$malId" params={{ malId: String(hero.mal_id) }}>
                    <Play className="w-4 h-4 mr-2" /> View details
                  </Link>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="border-border/60">
                <Link to="/browse">Browse catalog</Link>
              </Button>
            </div>
          </div>
          {hero?.poster_url && (
            <div className="hidden md:block">
              <div className="aspect-[2/3] max-w-sm ml-auto rounded-2xl overflow-hidden shadow-glow border border-border/40">
                <img src={hero.poster_url} alt={hero.title} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>

      <ContinueWatching />
      <Row title="Trending now" icon={<TrendingUp className="w-5 h-5 inline" />} items={trending.data ?? []} loading={trending.isLoading} />
      <Row title="This season" icon={<Calendar className="w-5 h-5 inline" />} items={season.data ?? []} loading={season.isLoading} />
    </div>
  );
}
