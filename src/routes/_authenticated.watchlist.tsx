import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyWatchlist, toggleWatchlist } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "My watchlist — animerewa" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const fn = useServerFn(getMyWatchlist);
  const toggle = useServerFn(toggleWatchlist);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["watchlist"], queryFn: () => fn() });

  const remove = useMutation({
    mutationFn: (malId: number) => toggle({ data: { malId } }),
    onMutate: async (malId: number) => {
      await qc.cancelQueries({ queryKey: ["watchlist"] });
      const prev = qc.getQueryData<any[]>(["watchlist"]);
      qc.setQueryData<any[]>(["watchlist"], (old) => (old ?? []).filter((w) => w.mal_id !== malId));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["watchlist"], ctx.prev);
      toast.error("Couldn't update your list");
    },
    onSuccess: () => {
      toast.success("Removed from watchlist");
      qc.invalidateQueries({ queryKey: ["watchlist"] });
    },
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
        <Heart className="w-7 h-7 text-primary fill-primary" /> My watchlist
      </h1>
      <p className="text-muted-foreground mb-8">
        {q.data?.length ? `${q.data.length} saved` : "Save anime you want to watch — they'll appear here."}
      </p>

      {q.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
          ))}
        </div>
      ) : (q.data?.length ?? 0) === 0 ? (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Your list is empty.</p>
          <Button asChild className="bg-gradient-primary"><Link to="/browse">Browse anime</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {q.data!.map((w: any) => w.anime && (
            <div key={w.mal_id} className="group relative">
              <Link to="/anime/$malId" params={{ malId: String(w.mal_id) }} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface shadow-card">
                  {w.anime.poster_url ? (
                    <img src={w.anime.poster_url} alt={w.anime.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-hero" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-70" />
                </div>
                <h3 className="mt-3 text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {w.anime.title_english || w.anime.title}
                </h3>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); remove.mutate(w.mal_id); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Remove from watchlist"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
