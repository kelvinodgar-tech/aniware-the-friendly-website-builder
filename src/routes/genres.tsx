import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listGenres } from "@/lib/anime.functions";
import { Tag } from "lucide-react";

export const Route = createFileRoute("/genres")({
  head: () => ({
    meta: [
      { title: "Genres — Aniware" },
      { name: "description", content: "Browse anime by genre on Aniware." },
    ],
  }),
  component: GenresPage,
});

function GenresPage() {
  const fn = useServerFn(listGenres);
  const { data, isLoading } = useQuery({ queryKey: ["genres"], queryFn: () => fn() });

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
        <Tag className="w-7 h-7 text-primary" /> Genres
      </h1>
      <p className="text-muted-foreground mb-8">Pick a genre to explore titles ranked by score.</p>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {(data ?? []).map((g) => (
            <Link
              key={g.mal_id}
              to="/genre/$genreId"
              params={{ genreId: String(g.mal_id) }}
              search={{ name: g.name }}
              className="p-4 rounded-xl bg-surface border border-border/50 hover:border-primary/60 hover:bg-accent transition-all group"
            >
              <div className="font-semibold group-hover:text-primary transition-colors">{g.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{g.count.toLocaleString()} titles</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
