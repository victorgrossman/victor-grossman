-- Tributes: allow idempotent imports (Memories → Tributes)
-- Safe to re-run.

alter table if exists public.tributes
  add column if not exists source text,
  add column if not exists source_key text;

create unique index if not exists tributes_source_key_key
  on public.tributes (source_key);

