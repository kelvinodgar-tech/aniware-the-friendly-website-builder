-- Roles enum + table (separate from profiles to prevent privilege escalation)
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Anime metadata cache (Jikan)
create table public.anime_cache (
  mal_id integer primary key,
  title text not null,
  title_english text,
  title_japanese text,
  synopsis text,
  poster_url text,
  banner_url text,
  episodes integer,
  status text,
  year integer,
  score numeric,
  genres jsonb default '[]'::jsonb,
  studios jsonb default '[]'::jsonb,
  type text,
  duration text,
  updated_at timestamptz not null default now()
);
create index on public.anime_cache (title);
create index on public.anime_cache (year desc);

-- Media links (one row per provider+quality+episode)
create table public.media_links (
  id uuid primary key default gen_random_uuid(),
  mal_id integer not null,
  episode_number integer not null,
  server_name text not null,           -- 'streamtape' | 'mp4upload' | 'generic'
  quality text not null default '720p',-- '480p' | '720p' | '1080p'
  embed_url text not null,
  direct_download_url text,
  subtitle_url text,
  language text default 'sub',         -- 'sub' | 'dub'
  priority integer not null default 100, -- lower = higher priority
  is_active boolean not null default true,
  status text not null default 'unknown', -- 'healthy' | 'broken' | 'unknown'
  last_checked_at timestamptz,
  last_failed_at timestamptz,
  retry_count integer not null default 0,
  health_score integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.media_links (mal_id, episode_number);
create index on public.media_links (status, last_checked_at);

-- Watch progress (composite key)
create table public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  mal_id integer not null,
  episode_number integer not null,
  position_seconds integer not null default 0,
  duration_seconds integer,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, mal_id, episode_number)
);
create index on public.watch_progress (user_id, updated_at desc);

-- Watchlist
create table public.watchlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  mal_id integer not null,
  added_at timestamptz not null default now(),
  primary key (user_id, mal_id)
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger anime_cache_updated_at before update on public.anime_cache
  for each row execute function public.set_updated_at();
create trigger media_links_updated_at before update on public.media_links
  for each row execute function public.set_updated_at();
create trigger watch_progress_updated_at before update on public.watch_progress
  for each row execute function public.set_updated_at();

-- Auto-create profile + default 'user' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.anime_cache enable row level security;
alter table public.media_links enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watchlist enable row level security;

-- Profiles: anyone can view, users can update their own
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- User roles: users see own roles, only admins manage
create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Anime cache: public read, admin write
create policy "anime_cache_select_all" on public.anime_cache for select using (true);
create policy "anime_cache_admin_write" on public.anime_cache for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Media links: anyone reads active ones; admins manage all
create policy "media_links_select_active" on public.media_links for select using (is_active = true or public.has_role(auth.uid(), 'admin'));
create policy "media_links_admin_write" on public.media_links for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Watch progress: user-owned
create policy "watch_progress_own" on public.watch_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Watchlist: user-owned
create policy "watchlist_own" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);