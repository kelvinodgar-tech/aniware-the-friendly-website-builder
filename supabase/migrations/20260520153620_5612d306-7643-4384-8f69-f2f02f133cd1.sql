
CREATE TABLE IF NOT EXISTS public.sync_state (
  provider TEXT PRIMARY KEY,
  cursor_page INTEGER NOT NULL DEFAULT 1,
  total_pages INTEGER,
  last_run_at TIMESTAMPTZ,
  last_full_pass_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_state public read"
  ON public.sync_state FOR SELECT USING (true);

INSERT INTO public.sync_state (provider, cursor_page)
VALUES ('anikoto', 1)
ON CONFLICT (provider) DO NOTHING;
