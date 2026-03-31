-- =============================================================
-- Memorial CMS - New Project Schema + RLS
-- Run this first in the NEW Supabase project's SQL Editor.
-- =============================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

-- Tributes
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
drop trigger if exists tributes_set_updated_at on public.tributes;
create trigger tributes_set_updated_at
  before update on public.tributes
  for each row execute function public.set_updated_at();
create unique index if not exists tributes_source_key_key
  on public.tributes (source_key);

-- Books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
  before update on public.books
  for each row execute function public.set_updated_at();

-- Articles
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
drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();
create unique index if not exists articles_wp_post_id_key
  on public.articles (wp_post_id);

-- Interviews
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  person text not null,
  role text,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists interviews_set_updated_at on public.interviews;
create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

-- Bulletins
create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  bulletin_number text,
  title text not null,
  content text not null,
  published_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists bulletins_set_updated_at on public.bulletins;
create trigger bulletins_set_updated_at
  before update on public.bulletins
  for each row execute function public.set_updated_at();

-- RLS
alter table public.photos enable row level security;
alter table public.tributes enable row level security;
alter table public.books enable row level security;
alter table public.articles enable row level security;
alter table public.interviews enable row level security;
alter table public.bulletins enable row level security;

-- Admin full access
 do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on photos') then
    create policy "Admin full access on photos" on public.photos
      for all using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on tributes') then
    create policy "Admin full access on tributes" on public.tributes
      for all using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on books') then
    create policy "Admin full access on books" on public.books
      for all using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on articles') then
    create policy "Admin full access on articles" on public.articles
      for all using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on interviews') then
    create policy "Admin full access on interviews" on public.interviews
      for all using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Admin full access on bulletins') then
    create policy "Admin full access on bulletins" on public.bulletins
      for all using (auth.role() = 'authenticated');
  end if;
end $$;

-- Public read access
 do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'Public read photos') then
    create policy "Public read photos" on public.photos
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public read tributes') then
    create policy "Public read tributes" on public.tributes
      for select using (status = 'approved');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public read books') then
    create policy "Public read books" on public.books
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public read articles') then
    create policy "Public read articles" on public.articles
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public read interviews') then
    create policy "Public read interviews" on public.interviews
      for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'Public read bulletins') then
    create policy "Public read bulletins" on public.bulletins
      for select using (true);
  end if;
end $$;
