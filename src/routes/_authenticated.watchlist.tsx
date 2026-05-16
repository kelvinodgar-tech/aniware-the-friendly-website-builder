import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { getMyWatchlist } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({ meta: [{ title: "My watchlist — Aniware" }] }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const fn = useServerFn(getMyWatchlist);
  const q = useQuery({ queryKey: ["watchlist"], queryFn: () => fn() });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-6 flex items-center gap-2">
        <Heart className="w-7 h-7 text-primary" /> My watchlist
      </h1>
      {q.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">Your list is empty.</p>
          <Link to="/browse" className="text-primary hover:underline">Browse anime →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {q.data!.map((w: any) => w.anime && <AnimeCard key={w.mal_id} a={w.anime} />)}
        </div>
      )}
    </div>
  );
}
