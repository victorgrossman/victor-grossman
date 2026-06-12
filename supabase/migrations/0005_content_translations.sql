-- Cached machine translations for articles and bulletins (EN ↔ DE)

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

create index if not exists content_translations_lookup_idx
  on public.content_translations (content_type, content_id, target_lang);

alter table public.content_translations enable row level security;

drop policy if exists "Public read content translations" on public.content_translations;
create policy "Public read content translations"
  on public.content_translations for select
  using (true);
