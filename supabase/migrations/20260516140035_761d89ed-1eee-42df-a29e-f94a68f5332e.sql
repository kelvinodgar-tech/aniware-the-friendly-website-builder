
create type public.ingestion_status as enum ('pending','processing','done','failed');

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  mal_id integer not null,
  episode_number integer not null,
  release_title text,
  release_group text,
  magnet text not null,
  quality text default '720p',
  status public.ingestion_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingestion_jobs_pick_idx on public.ingestion_jobs (status, created_at);
create unique index ingestion_jobs_unique_ep on public.ingestion_jobs (mal_id, episode_number) where status in ('pending','processing');

alter table public.ingestion_jobs enable row level security;

create policy ingestion_jobs_admin_all on public.ingestion_jobs
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger ingestion_jobs_set_updated
  before update on public.ingestion_jobs
  for each row execute function public.set_updated_at();
