-- Articles: fields for WordPress import + idempotent upserts by WordPress post ID
-- Run in Supabase SQL Editor after 0001_init.sql

alter table if exists public.articles
  add column if not exists wp_post_id bigint,
  add column if not exists category text,
  add column if not exists author text,
  add column if not exists is_published boolean not null default true;

-- Multiple NULL wp_post_id allowed; non-null values must be unique (WordPress post IDs).
create unique index if not exists articles_wp_post_id_key
  on public.articles (wp_post_id);
