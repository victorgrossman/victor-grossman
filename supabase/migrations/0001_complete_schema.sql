-- =============================================================
-- Victor Grossman Memorial CMS — Complete database setup
-- =============================================================
-- Run this ONCE in the Supabase SQL Editor (new or existing project).
-- Safe to re-run: uses IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, and
-- DROP POLICY IF EXISTS before recreating policies.
--
-- For content rows (photos, books, bulletins, etc.) run next:
--   transfer-chunks/*.sql in order (see transfer-chunks/README-RUN-ORDER.txt)
-- =============================================================

create extension if not exists pgcrypto;

-- Auto-set updated_at on every UPDATE
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =====================
-- 1. TABLES
-- =====================

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  rejected_at timestamptz,
  submitted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  message text not null,
  image_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  approved_at timestamptz,
  rejected_at timestamptz,
  source text,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  content text not null,
  image_url text,
  wp_post_id bigint,
  category text,
  author text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person text not null,
  role text,
  content text,
  image_url text,
  media_type text not null default 'audio'
    check (media_type in ('audio', 'video')),
  media_url text,
  location_meta text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  bulletin_number text,
  title text not null,
  content text not null,
  published_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('article', 'bulletin')),
  content_id uuid not null,
  field_name text not null check (field_name in ('title', 'content', 'excerpt')),
  target_lang text not null check (target_lang in ('en', 'de')),
  source_hash text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  unique (content_type, content_id, field_name, target_lang)
);

-- Upgrade older installs (columns added across migrations 0002–0007)
alter table public.photos alter column title drop not null;

alter table if exists public.photos
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists submitted_by text;

alter table if exists public.tributes
  add column if not exists source text,
  add column if not exists source_key text;

alter table if exists public.articles
  add column if not exists wp_post_id bigint,
  add column if not exists category text,
  add column if not exists author text,
  add column if not exists is_published boolean not null default true;

alter table if exists public.interviews
  add column if not exists media_type text not null default 'audio'
    check (media_type in ('audio', 'video')),
  add column if not exists media_url text,
  add column if not exists location_meta text,
  add column if not exists sort_order integer not null default 0;

alter table public.interviews
  alter column content drop not null;

-- Existing photos count as approved
update public.photos
set
  status = 'approved',
  approved_at = coalesce(approved_at, created_at),
  rejected_at = null
where status is distinct from 'approved';

-- =====================
-- 2. INDEXES
-- =====================

create unique index if not exists tributes_source_key_key
  on public.tributes (source_key);

create unique index if not exists articles_wp_post_id_key
  on public.articles (wp_post_id);

create index if not exists content_translations_lookup_idx
  on public.content_translations (content_type, content_id, target_lang);

-- =====================
-- 3. TRIGGERS
-- =====================

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

drop trigger if exists tributes_set_updated_at on public.tributes;
create trigger tributes_set_updated_at
  before update on public.tributes
  for each row execute function public.set_updated_at();

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

drop trigger if exists interviews_set_updated_at on public.interviews;
create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

drop trigger if exists bulletins_set_updated_at on public.bulletins;
create trigger bulletins_set_updated_at
  before update on public.bulletins
  for each row execute function public.set_updated_at();

-- =====================
-- 4. ROW LEVEL SECURITY
-- =====================

alter table public.photos enable row level security;
alter table public.tributes enable row level security;
alter table public.books enable row level security;
alter table public.articles enable row level security;
alter table public.interviews enable row level security;
alter table public.bulletins enable row level security;
alter table public.content_translations enable row level security;

drop policy if exists "Admin full access on photos" on public.photos;
drop policy if exists "Public read photos" on public.photos;
drop policy if exists "Public submit photos" on public.photos;

drop policy if exists "Admin full access on tributes" on public.tributes;
drop policy if exists "Public read tributes" on public.tributes;
drop policy if exists "Public submit tributes" on public.tributes;

drop policy if exists "Admin full access on books" on public.books;
drop policy if exists "Public read books" on public.books;

drop policy if exists "Admin full access on articles" on public.articles;
drop policy if exists "Public read articles" on public.articles;

drop policy if exists "Admin full access on interviews" on public.interviews;
drop policy if exists "Public read interviews" on public.interviews;

drop policy if exists "Admin full access on bulletins" on public.bulletins;
drop policy if exists "Public read bulletins" on public.bulletins;

drop policy if exists "Public read content translations" on public.content_translations;

create policy "Admin full access on photos"
  on public.photos for all to authenticated
  using (true) with check (true);

create policy "Public read photos"
  on public.photos for select to anon, authenticated
  using (status = 'approved');

create policy "Public submit photos"
  on public.photos for insert to anon, authenticated
  with check (status = 'pending');

create policy "Admin full access on tributes"
  on public.tributes for all to authenticated
  using (true) with check (true);

create policy "Public read tributes"
  on public.tributes for select to anon, authenticated
  using (status = 'approved');

create policy "Public submit tributes"
  on public.tributes for insert to anon, authenticated
  with check (status = 'pending');

create policy "Admin full access on books"
  on public.books for all to authenticated
  using (true) with check (true);

create policy "Public read books"
  on public.books for select to anon, authenticated
  using (true);

create policy "Admin full access on articles"
  on public.articles for all to authenticated
  using (true) with check (true);

create policy "Public read articles"
  on public.articles for select to anon, authenticated
  using (true);

create policy "Admin full access on interviews"
  on public.interviews for all to authenticated
  using (true) with check (true);

create policy "Public read interviews"
  on public.interviews for select to anon, authenticated
  using (true);

create policy "Admin full access on bulletins"
  on public.bulletins for all to authenticated
  using (true) with check (true);

create policy "Public read bulletins"
  on public.bulletins for select to anon, authenticated
  using (true);

create policy "Public read content translations"
  on public.content_translations for select
  using (true);

-- =====================
-- 5. STORAGE (public photo uploads)
-- =====================

insert into storage.buckets (id, name, public)
values ('victor-public', 'victor-public', true)
on conflict (id) do nothing;

drop policy if exists "Public read victor-public" on storage.objects;
create policy "Public read victor-public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'victor-public');

drop policy if exists "Public upload victor-public" on storage.objects;
create policy "Public upload victor-public"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'victor-public');

drop policy if exists "Admin manage victor-public" on storage.objects;
create policy "Admin manage victor-public"
  on storage.objects for all to authenticated
  using (bucket_id = 'victor-public')
  with check (bucket_id = 'victor-public');

-- =====================
-- 6. DEFAULT INTERVIEW SEED (only when table is empty)
-- =====================

insert into public.interviews (
  title,
  person,
  role,
  content,
  media_type,
  media_url,
  image_url,
  location_meta,
  sort_order
)
select *
from (
  values
    (
      'The Man Who Swam to the East',
      'Democracy Now!',
      null::text,
      'A feature interview about the legacy of the Cold War and his pivotal 1952 decision to defect across the Danube.',
      'audio',
      'https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/SF-18-05-14-Victor%20Grossman-si.mp3',
      null::text,
      null::text,
      1
    ),
    (
      'Victor Grossman: Begegnungen mit Pete Seeger (1979)',
      'Berliner Rundfunk',
      null::text,
      'Eine historische Sendung mit Victor Grossman über Pete Seeger und die Kraft politischer Lieder.',
      'audio',
      'https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/Victor%20Grossman%20Begegnungen%20mit%20Pete%20Seeger%20Berliner%20Rundfunk%2006.%20Mai%201979.mp3',
      null::text,
      null::text,
      2
    ),
    (
      'Ein Leben für die Gerechtigkeit',
      'Video-Porträt',
      null::text,
      null::text,
      'video',
      'https://ik.imagekit.io/mq26ahrml/VictorG_08052026.mp4?updatedAt=1770766503473',
      'https://bilder.deutschlandfunk.de/FI/LE/_3/70/FILE_37094d6d0577fb2093d8e96b3ff84bd9/2630844420-victor-2019-jpg-100-1920x1080.jpg',
      'Treptower Park — May 8, 2025',
      3
    )
) as seed (
  title,
  person,
  role,
  content,
  media_type,
  media_url,
  image_url,
  location_meta,
  sort_order
)
where not exists (select 1 from public.interviews limit 1);

-- Fix interview copy if an older seed was applied
update public.interviews
set
  content = 'A feature interview about the legacy of the Cold War and his pivotal 1952 decision to defect across the Danube.'
where title = 'The Man Who Swam to the East';

update public.interviews
set
  title = 'Victor Grossman: Begegnungen mit Pete Seeger (1979)',
  role = null,
  content = 'Eine historische Sendung mit Victor Grossman über Pete Seeger und die Kraft politischer Lieder.'
where person = 'Berliner Rundfunk'
  and title like '%Pete Seeger%';

update public.interviews
set person = 'Video-Porträt'
where title = 'Ein Leben für die Gerechtigkeit'
  and person = 'Video Portrait';
