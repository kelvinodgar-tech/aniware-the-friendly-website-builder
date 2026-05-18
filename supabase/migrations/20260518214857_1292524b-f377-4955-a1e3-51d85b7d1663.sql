-- Remove iframe mirrors that block embedding in browsers
DELETE FROM public.media_links
WHERE server_name IN ('vidsrc', '2embed', 'miruro')
   OR embed_url ILIKE '%vidsrc.cc%'
   OR embed_url ILIKE '%2embed.cc%'
   OR embed_url ILIKE '%miruro.tv%';

-- Seed authorized, CORS-enabled HLS streams for immediate playback tests.
-- These are legal sample streams used to verify the player flow while real licensed hosts are added.
INSERT INTO public.media_links (
  mal_id,
  episode_number,
  server_name,
  quality,
  embed_url,
  direct_download_url,
  language,
  priority,
  is_active,
  status,
  health_score
)
VALUES
  (52991, 1, 'direct', '720p', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', 'sub', 5, true, 'healthy', 100),
  (38000, 1, 'direct', '720p', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8', 'sub', 5, true, 'healthy', 100),
  (16498, 1, 'direct', '720p', 'https://test-streams.mux.dev/test_001/stream.m3u8', 'https://test-streams.mux.dev/test_001/stream.m3u8', 'sub', 5, true, 'healthy', 100)
ON CONFLICT DO NOTHING;