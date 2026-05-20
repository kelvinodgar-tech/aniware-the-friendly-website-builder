// Anikoto API client. https://anikotoapi.site
// Returns iframe streams (megaplay.buzz) keyed by their own series id.
// We map MAL ids → Anikoto ids via the provider_map table.

const BASE = "https://anikotoapi.site";

export type AnikotoListItem = {
  id: number;
  slug: string;
  title: string;
  mal_id: string | null;
  episodes: string | null;
};

export type AnikotoSeries = {
  anime: AnikotoListItem & { poster?: string; description?: string };
  episodes: Array<{
    number: number;
    embed_url: { sub?: string | null; dub?: string | null };
  }>;
};

async function jget<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "user-agent": "AniwareBot/1.0" },
  });
  if (!res.ok) throw new Error(`Anikoto ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function anikotoSeries(id: string | number) {
  const d = await jget<{ ok: boolean; data: AnikotoSeries }>(`/series/${id}`);
  return d.data;
}

export async function anikotoRecentPage(page: number, per_page = 100) {
  const d = await jget<{
    ok: boolean;
    data: AnikotoListItem[];
    pagination: { page: number; per_page: number; total: number; total_pages: number };
  }>(`/recent-anime?page=${page}&per_page=${per_page}`);
  return d;
}
