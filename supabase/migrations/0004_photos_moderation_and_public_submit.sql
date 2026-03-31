-- Photos moderation + public submission support

alter table if exists public.photos
  add column if not exists status text not null default 'approved'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists submitted_by text;

-- Existing photos are considered approved content.
update public.photos
set
  status = 'approved',
  approved_at = coalesce(approved_at, created_at),
  rejected_at = null
where status is distinct from 'approved';

-- Public website should only show approved photos.
drop policy if exists "Public read photos" on public.photos;
create policy "Public read photos"
on public.photos
for select
to anon, authenticated
using (status = 'approved');

-- Allow public submission queue from Victor site.
drop policy if exists "Public submit photos" on public.photos;
create policy "Public submit photos"
on public.photos
for insert
to anon, authenticated
with check (status = 'pending');

-- Allow public memory submissions (pending) from Victor site.
drop policy if exists "Public submit tributes" on public.tributes;
create policy "Public submit tributes"
on public.tributes
for insert
to anon, authenticated
with check (status = 'pending');

-- Supabase Storage bucket for public upload files.
insert into storage.buckets (id, name, public)
values ('victor-public', 'victor-public', true)
on conflict (id) do nothing;

-- Public can upload/view files in this bucket.
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

-- Admin can manage bucket files.
drop policy if exists "Admin manage victor-public" on storage.objects;
create policy "Admin manage victor-public"
on storage.objects
for all
to authenticated
using (bucket_id = 'victor-public')
with check (bucket_id = 'victor-public');
