-- Supabase/PostgreSQL schema for the hometown mathematics curator workflow.
-- The existing Sites deployment keeps using D1/R2; this migration is for the
-- independent Vercel + Supabase deployment.

create table if not exists public.hometown_exhibitions (
  id text primary key,
  owner_id text not null,
  owner_email text not null,
  slug text not null unique,
  title text not null,
  school_class text not null default '',
  location_label text not null default '',
  visibility text not null default 'unpublished'
    check (visibility in ('unpublished', 'link-only')),
  cover_asset_id text,
  manifest_version integer not null default 0 check (manifest_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hometown_exhibitions_owner_updated
  on public.hometown_exhibitions (owner_id, updated_at desc);

create table if not exists public.hometown_zones (
  id text primary key,
  exhibition_id text not null references public.hometown_exhibitions(id) on delete cascade,
  name text not null,
  subtitle text not null default '',
  order_index integer not null default 0
);

create index if not exists idx_hometown_zones_exhibition_order
  on public.hometown_zones (exhibition_id, order_index);

create table if not exists public.hometown_assets (
  id text primary key,
  exhibition_id text not null references public.hometown_exhibitions(id) on delete cascade,
  owner_id text not null,
  object_key text not null unique,
  thumbnail_key text not null unique,
  filename text not null,
  content_type text not null,
  byte_size integer not null check (byte_size >= 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  status text not null default 'UPLOADED',
  created_at timestamptz not null default now()
);

create index if not exists idx_hometown_assets_exhibition
  on public.hometown_assets (exhibition_id, created_at);

create table if not exists public.hometown_exhibits (
  id text primary key,
  exhibition_id text not null references public.hometown_exhibitions(id) on delete cascade,
  asset_id text not null unique references public.hometown_assets(id) on delete cascade,
  zone_id text not null references public.hometown_zones(id) on delete cascade,
  order_index integer not null default 0,
  title text not null default '等待发现',
  concept_id text,
  interpretation text not null default '',
  evidence text not null default '',
  learning_json jsonb not null default '{}'::jsonb,
  overlay_json jsonb not null default '{}'::jsonb,
  candidates_json jsonb not null default '[]'::jsonb,
  teacher_confirmed boolean not null default false,
  rejected boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists idx_hometown_exhibits_exhibition_order
  on public.hometown_exhibits (exhibition_id, zone_id, order_index);

create table if not exists public.hometown_published_manifests (
  id text primary key,
  exhibition_id text not null references public.hometown_exhibitions(id) on delete cascade,
  slug text not null,
  version integer not null check (version > 0),
  manifest_json jsonb not null,
  published_at timestamptz not null default now(),
  unique (exhibition_id, version)
);

create index if not exists idx_hometown_manifests_slug_version
  on public.hometown_published_manifests (slug, version desc);

create or replace function public.set_hometown_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists hometown_exhibitions_updated_at on public.hometown_exhibitions;
create trigger hometown_exhibitions_updated_at
before update on public.hometown_exhibitions
for each row execute function public.set_hometown_updated_at();

drop trigger if exists hometown_exhibits_updated_at on public.hometown_exhibits;
create trigger hometown_exhibits_updated_at
before update on public.hometown_exhibits
for each row execute function public.set_hometown_updated_at();

alter table public.hometown_exhibitions enable row level security;
alter table public.hometown_zones enable row level security;
alter table public.hometown_assets enable row level security;
alter table public.hometown_exhibits enable row level security;
alter table public.hometown_published_manifests enable row level security;

-- Re-running the migration locally should replace policies rather than fail.
drop policy if exists "owners manage exhibitions" on public.hometown_exhibitions;
create policy "owners manage exhibitions"
on public.hometown_exhibitions
for all to authenticated
using (owner_id = auth.uid()::text)
with check (owner_id = auth.uid()::text);

drop policy if exists "visitors read published exhibitions" on public.hometown_exhibitions;
create policy "visitors read published exhibitions"
on public.hometown_exhibitions
for select to anon, authenticated
using (visibility = 'link-only');

drop policy if exists "owners manage zones" on public.hometown_zones;
create policy "owners manage zones"
on public.hometown_zones
for all to authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_zones.exhibition_id
    and exhibition.owner_id = auth.uid()::text
))
with check (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_zones.exhibition_id
    and exhibition.owner_id = auth.uid()::text
));

drop policy if exists "visitors read published zones" on public.hometown_zones;
create policy "visitors read published zones"
on public.hometown_zones
for select to anon, authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_zones.exhibition_id
    and exhibition.visibility = 'link-only'
));

drop policy if exists "owners manage assets" on public.hometown_assets;
create policy "owners manage assets"
on public.hometown_assets
for all to authenticated
using (owner_id = auth.uid()::text)
with check (
  owner_id = auth.uid()::text
  and exists (
    select 1 from public.hometown_exhibitions exhibition
    where exhibition.id = hometown_assets.exhibition_id
      and exhibition.owner_id = auth.uid()::text
  )
);

drop policy if exists "owners manage exhibits" on public.hometown_exhibits;
create policy "owners manage exhibits"
on public.hometown_exhibits
for all to authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_exhibits.exhibition_id
    and exhibition.owner_id = auth.uid()::text
))
with check (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_exhibits.exhibition_id
    and exhibition.owner_id = auth.uid()::text
));

drop policy if exists "visitors read published exhibits" on public.hometown_exhibits;
create policy "visitors read published exhibits"
on public.hometown_exhibits
for select to anon, authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_exhibits.exhibition_id
    and exhibition.visibility = 'link-only'
));

drop policy if exists "owners manage manifests" on public.hometown_published_manifests;
create policy "owners manage manifests"
on public.hometown_published_manifests
for all to authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_published_manifests.exhibition_id
    and exhibition.owner_id = auth.uid()::text
))
with check (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_published_manifests.exhibition_id
    and exhibition.owner_id = auth.uid()::text
));

drop policy if exists "visitors read published manifests" on public.hometown_published_manifests;
create policy "visitors read published manifests"
on public.hometown_published_manifests
for select to anon, authenticated
using (exists (
  select 1 from public.hometown_exhibitions exhibition
  where exhibition.id = hometown_published_manifests.exhibition_id
    and exhibition.visibility = 'link-only'
));

-- Private storage. Public exhibition images continue to be served through the
-- same-origin media route, which can authorize drafts and cache published files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hometown-media',
  'hometown-media',
  false,
  12582912,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "teachers read their hometown media" on storage.objects;
create policy "teachers read their hometown media"
on storage.objects
for select to authenticated
using (
  bucket_id = 'hometown-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "teachers upload their hometown media" on storage.objects;
create policy "teachers upload their hometown media"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'hometown-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "teachers update their hometown media" on storage.objects;
create policy "teachers update their hometown media"
on storage.objects
for update to authenticated
using (
  bucket_id = 'hometown-media'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'hometown-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "teachers delete their hometown media" on storage.objects;
create policy "teachers delete their hometown media"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'hometown-media'
  and (storage.foldername(name))[2] = auth.uid()::text
);
