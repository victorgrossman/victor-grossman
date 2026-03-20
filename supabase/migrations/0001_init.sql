-- Memorial CMS - admin content tables
-- Run in your Supabase SQL editor / migration tool.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists photos_set_updated_at on public.photos;
create trigger photos_set_updated_at
before update on public.photos
for each row execute function set_updated_at();

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tributes_set_updated_at on public.tributes;
create trigger tributes_set_updated_at
before update on public.tributes
for each row execute function set_updated_at();

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
for each row execute function set_updated_at();

-- Articles
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row execute function set_updated_at();

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
for each row execute function set_updated_at();

-- Note:
-- This project uses Supabase Auth session cookies via middleware.
-- Add appropriate RLS policies for production security in your Supabase project.

