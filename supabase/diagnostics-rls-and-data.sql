-- =============================================================
-- CMS diagnostics: RLS + row counts + auth sanity
-- Run in Supabase SQL Editor (new project)
-- =============================================================

-- 1) Who am I in this SQL session?
select
  current_user as db_user,
  current_setting('role', true) as db_role;

-- 2) Table row counts
select 'photos' as table_name, count(*) as row_count from public.photos
union all
select 'tributes' as table_name, count(*) as row_count from public.tributes
union all
select 'books' as table_name, count(*) as row_count from public.books
union all
select 'articles' as table_name, count(*) as row_count from public.articles
union all
select 'interviews' as table_name, count(*) as row_count from public.interviews
union all
select 'bulletins' as table_name, count(*) as row_count from public.bulletins
order by table_name;

-- 3) Policy list for all CMS tables
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('photos','tributes','books','articles','interviews','bulletins')
order by tablename, policyname;

-- 4) RLS enabled state check
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('photos','tributes','books','articles','interviews','bulletins')
order by c.relname;

-- 5) Content visibility check relevant to public website
select
  count(*) filter (where status = 'approved') as approved_tributes,
  count(*) filter (where status <> 'approved' or status is null) as non_approved_tributes
from public.tributes;

select
  count(*) filter (where is_published = true) as published_articles,
  count(*) filter (where is_published = false) as unpublished_articles
from public.articles;
