DELETE FROM public.anime_cache a
WHERE NOT EXISTS (SELECT 1 FROM public.provider_map p WHERE p.mal_id = a.mal_id)
  AND NOT EXISTS (SELECT 1 FROM public.media_links m WHERE m.mal_id = a.mal_id);