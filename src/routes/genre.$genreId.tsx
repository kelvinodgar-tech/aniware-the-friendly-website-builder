import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { animeByGenre } from "@/lib/anime.functions";
import { AnimeCard } from "@/components/anime-card";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/genre/$genreId")({
  validateSearch: (s: Record<string, unknown>) => ({ name: typeof s.name === "string" ? s.name : "" }),
  head: ({ params, match }) => ({
    meta: [
      { title: `${(match.search as any).name || "Genre"} anime — Aniware` },
      { name: "description", content: `Top anime in the ${(match.search as any).name || ""} genre.` },
    ],
  }),
  component: GenrePage,
});

function GenrePage() {
  const { genreId } = Route.useParams();
  const { name } = Route.useSearch();
  const fn = useServerFn(animeByGenre);
  const { data, isLoading } = useQuery({
    queryKey: ["genre", genreId],
    queryFn: () => fn({ data: { genreId: Number(genreId), page: 1 } }),
  });

  return (
    <div className="container mx-auto px-4 py-10">
      <Link to="/genres" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" /> All genres
      </Link>
      <h1 className="font-display text-3xl font-bold mb-8">{name || "Genre"}</h1>
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="text-muted-foreground">No titles found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data!.map((a) => <AnimeCard key={a.mal_id} a={a} />)}
        </div>
      )}
    </div>
  );
}
