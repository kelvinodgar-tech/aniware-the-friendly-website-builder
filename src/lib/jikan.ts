// Jikan API wrappers (no key required). Used server-side only.
// Docs: https://docs.api.jikan.moe/

const JIKAN = "https://api.jikan.moe/v4";

export type JikanAnime = {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  synopsis: string | null;
  images: { jpg: { large_image_url: string; image_url: string } };
  episodes: number | null;
  status: string | null;
  year: number | null;
  score: number | null;
  type: string | null;
  duration: string | null;
  genres: Array<{ name: string }>;
  studios: Array<{ name: string }>;
};

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${JIKAN}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jikan ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// Relevance filter: drop kids/hentai-leaning, unscored or low-score outliers,
// and non-series formats unless explicitly requested.
function isRelevant(a: JikanAnime) {
  if (!a) return false;
  const t = (a.type ?? "").toLowerCase();
  if (t === "music" || t === "cm" || t === "pv") return false;
  if (a.score != null && a.score < 5) return false;
  return true;
}

export async function jikanTop(limit = 20) {
  const d = await jget<{ data: JikanAnime[] }>(`/top/anime?limit=${limit}&type=tv&filter=bypopularity&sfw=true`);
  return (d.data ?? []).filter(isRelevant);
}

export async function jikanSeasonNow(limit = 20) {
  const d = await jget<{ data: JikanAnime[] }>(`/seasons/now?limit=${limit}&filter=tv&sfw=true`);
  return (d.data ?? []).filter(isRelevant);
}

export async function jikanSearch(query: string, page = 1) {
  const d = await jget<{ data: JikanAnime[] }>(
    `/anime?q=${encodeURIComponent(query)}&page=${page}&limit=24&sfw=true&order_by=score&sort=desc`
  );
  return (d.data ?? []).filter(isRelevant);
}

export async function jikanGenres() {
  const d = await jget<{ data: Array<{ mal_id: number; name: string; count: number }> }>(`/genres/anime?filter=genres`);
  return d.data;
}

export async function jikanByGenre(genreId: number, page = 1) {
  const d = await jget<{ data: JikanAnime[] }>(`/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}&limit=24&sfw=true&type=tv&min_score=6`);
  return (d.data ?? []).filter(isRelevant);
}

export async function jikanSchedule(day: string) {
  const d = await jget<{ data: JikanAnime[] }>(`/schedules?filter=${day}&sfw=true&limit=25&kids=false`);
  return (d.data ?? []).filter(isRelevant);
}

export async function jikanDetails(malId: number) {
  const d = await jget<{ data: JikanAnime }>(`/anime/${malId}/full`);
  return d.data;
}

export function toAnimeRow(a: JikanAnime) {
  return {
    mal_id: a.mal_id,
    title: a.title,
    title_english: a.title_english,
    title_japanese: a.title_japanese,
    synopsis: a.synopsis,
    poster_url: a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url ?? null,
    episodes: a.episodes,
    status: a.status,
    year: a.year,
    score: a.score,
    type: a.type,
    duration: a.duration,
    genres: a.genres?.map((g) => g.name) ?? [],
    studios: a.studios?.map((s) => s.name) ?? [],
  };
}
