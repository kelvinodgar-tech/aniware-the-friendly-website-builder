import { Link } from "@tanstack/react-router";
import { Play, Star } from "lucide-react";

export type AnimeCardData = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  poster_url?: string | null;
  score?: number | null;
  year?: number | null;
  episodes?: number | null;
  type?: string | null;
};

export function AnimeCard({ a }: { a: AnimeCardData }) {
  return (
    <Link
      to="/anime/$malId"
      params={{ malId: String(a.mal_id) }}
      className="group block"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface shadow-card">
        {a.poster_url ? (
          <img
            src={a.poster_url}
            alt={a.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-glow">
            <Play className="w-6 h-6 text-primary-foreground ml-1" />
          </div>
        </div>
        {a.score ? (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-background/80  text-xs font-medium">
            <Star className="w-3 h-3 fill-warning text-warning" />
            {a.score.toFixed(1)}
          </div>
        ) : null}
        {a.type ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-primary/80  text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
            {a.type}
          </div>
        ) : null}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {a.title_english || a.title}
        </h3>
        <div className="text-xs text-muted-foreground mt-1">
          {a.year ?? "—"} · {a.episodes ? `${a.episodes} eps` : "Ongoing"}
        </div>
      </div>
    </Link>
  );
}
