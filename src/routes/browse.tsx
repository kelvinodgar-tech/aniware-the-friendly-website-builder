import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AnimeCard } from "@/components/anime-card";
import { Skeleton } from "@/components/ui/skeleton";
import { searchAnime, getTrending } from "@/lib/anime.functions";

type SearchParams = { q?: string };

export const Route = createFileRoute("/browse")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse anime — animerewa" },
      { name: "description", content: "Search and discover anime by title on animerewa." },
      { property: "og:title", content: "Browse anime — animerewa" },
      { property: "og:description", content: "Search and discover anime by title on animerewa." },
    ],
  }),
  component: Browse,
});

function Browse() {
  const { q } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q ?? "");
  const searchFn = useServerFn(searchAnime);
  const trendingFn = useServerFn(getTrending);

  useEffect(() => setInput(q ?? ""), [q]);

  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: () => trendingFn(),
    enabled: !q,
    staleTime: 5 * 60_000,
  });

  const results = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchFn({ data: { query: q! } }),
    enabled: !!q,
  });

  const list = q ? results.data : trending.data;
  const loading = q ? results.isLoading : trending.isLoading;

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Browse</h1>
      <p className="text-muted-foreground mb-6">Find your next favorite series.</p>

      <form
        className="max-w-xl mb-10"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = input.trim();
          navigate({ to: "/browse", search: trimmed ? { q: trimmed } : {} });
        }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by title (e.g. Frieren, Bleach…)"
            className="pl-9 h-12 bg-surface/60 border-border/50"
          />
        </div>
      </form>

      {!q && <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Popular right now</h2>}
      {q && <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Results for "{q}"</h2>}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}><Skeleton className="aspect-[2/3] rounded-xl" /><Skeleton className="h-4 mt-3 w-3/4" /></div>
          ))}
        </div>
      ) : list && list.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {list.map((a) => <AnimeCard key={a.mal_id} a={a} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">No results.</div>
      )}
    </div>
  );
}
