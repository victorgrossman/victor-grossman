-- Optional Amazon product page URL for each book

alter table public.books
  add column if not exists amazon_url text;

comment on column public.books.amazon_url is
  'Full Amazon product URL (e.g. amazon.com/dp/… or amazon.de/dp/…).';
