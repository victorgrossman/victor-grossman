-- Caption (stored as title) is optional for gallery photos.
alter table public.photos alter column title drop not null;
