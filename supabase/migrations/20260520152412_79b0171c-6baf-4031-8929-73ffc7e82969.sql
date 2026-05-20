
CREATE TABLE IF NOT EXISTS public.provider_map (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  mal_id INTEGER NOT NULL,
  external_id TEXT NOT NULL,
  slug TEXT,
  total_episodes INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, mal_id),
  UNIQUE (provider, external_id)
);

CREATE INDEX IF NOT EXISTS provider_map_mal_idx ON public.provider_map(mal_id);

ALTER TABLE public.provider_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_map public read"
  ON public.provider_map FOR SELECT USING (true);

-- de-dupe media_links so upserts work
DELETE FROM public.media_links a
USING public.media_links b
WHERE a.ctid < b.ctid
  AND a.mal_id = b.mal_id
  AND a.episode_number = b.episode_number
  AND a.server_name = b.server_name
  AND COALESCE(a.language,'') = COALESCE(b.language,'');

ALTER TABLE public.media_links
  DROP CONSTRAINT IF EXISTS media_links_unique_mirror;
ALTER TABLE public.media_links
  ADD CONSTRAINT media_links_unique_mirror
  UNIQUE (mal_id, episode_number, server_name, language);
