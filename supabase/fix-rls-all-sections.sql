-- =============================================================
-- RLS hard reset for all CMS tables in new Supabase project
-- Run this in SQL Editor if admin create/update/delete fails with RLS.
-- =============================================================

-- Ensure RLS is enabled
alter table public.photos enable row level security;
alter table public.tributes enable row level security;
alter table public.books enable row level security;
alter table public.articles enable row level security;
alter table public.interviews enable row level security;
alter table public.bulletins enable row level security;

-- Ensure photo moderation fields exist
alter table if exists public.photos
	add column if not exists status text not null default 'approved'
		check (status in ('pending', 'approved', 'rejected')),
	add column if not exists approved_at timestamptz,
	add column if not exists rejected_at timestamptz,
	add column if not exists submitted_by text;

update public.photos
set
	status = 'approved',
	approved_at = coalesce(approved_at, created_at),
	rejected_at = null
where status is distinct from 'approved';

-- Drop old policies if they exist

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

-- Admin policies: allow authenticated users full CRUD

create policy "Admin full access on photos"
on public.photos
for all
to authenticated
using (true)
with check (true);

create policy "Admin full access on tributes"
on public.tributes
for all
to authenticated
using (true)
with check (true);

create policy "Admin full access on books"
on public.books
for all
to authenticated
using (true)
with check (true);

create policy "Admin full access on articles"
on public.articles
for all
to authenticated
using (true)
with check (true);

create policy "Admin full access on interviews"
on public.interviews
for all
to authenticated
using (true)
with check (true);

create policy "Admin full access on bulletins"
on public.bulletins
for all
to authenticated
using (true)
with check (true);

-- Public read policies

create policy "Public read photos"
on public.photos
for select
to anon, authenticated
using (status = 'approved');

create policy "Public submit photos"
on public.photos
for insert
to anon, authenticated
with check (status = 'pending');

create policy "Public read tributes"
on public.tributes
for select
to anon, authenticated
using (status = 'approved');

create policy "Public submit tributes"
on public.tributes
for insert
to anon, authenticated
with check (status = 'pending');

create policy "Public read books"
on public.books
for select
to anon, authenticated
using (true);

create policy "Public read articles"
on public.articles
for select
to anon, authenticated
using (true);

create policy "Public read interviews"
on public.interviews
for select
to anon, authenticated
using (true);

create policy "Public read bulletins"
on public.bulletins
for select
to anon, authenticated
using (true);

-- Public photo upload storage bucket + policies
insert into storage.buckets (id, name, public)
values ('victor-public', 'victor-public', true)
on conflict (id) do nothing;

drop policy if exists "Public read victor-public" on storage.objects;
create policy "Public read victor-public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'victor-public');

drop policy if exists "Public upload victor-public" on storage.objects;
create policy "Public upload victor-public"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'victor-public');

drop policy if exists "Admin manage victor-public" on storage.objects;
create policy "Admin manage victor-public"
on storage.objects
for all
to authenticated
using (bucket_id = 'victor-public')
with check (bucket_id = 'victor-public');

-- Optional sanity check
-- select schemaname, tablename, policyname, cmd, roles from pg_policies where schemaname='public' order by tablename, policyname;
