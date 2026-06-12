-- Interviews: support audio and video media types
alter table public.interviews
  add column if not exists media_type text not null default 'audio'
    check (media_type in ('audio', 'video')),
  add column if not exists media_url text,
  add column if not exists location_meta text,
  add column if not exists sort_order integer not null default 0;

alter table public.interviews
  alter column content drop not null;

-- Seed default interviews when the table is empty
insert into public.interviews (
  title,
  person,
  role,
  content,
  media_type,
  media_url,
  image_url,
  location_meta,
  sort_order
)
select *
from (
  values
    (
      'The Man Who Swam to the East',
      'Democracy Now!',
      null::text,
      'A feature interview about the legacy of the Cold War and his pivotal 1952 decision to defect across the Danube.',
      'audio',
      'https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/SF-18-05-14-Victor%20Grossman-si.mp3',
      null::text,
      null::text,
      1
    ),
    (
      'Victor Grossman: Begegnungen mit Pete Seeger (1979)',
      'Berliner Rundfunk',
      null::text,
      'Eine historische Sendung mit Victor Grossman über Pete Seeger und die Kraft politischer Lieder.',
      'audio',
      'https://prinomaaszkdknrluweo.supabase.co/storage/v1/object/public/victor%20grossman/Victor%20Grossman%20Begegnungen%20mit%20Pete%20Seeger%20Berliner%20Rundfunk%2006.%20Mai%201979.mp3',
      null::text,
      null::text,
      2
    ),
    (
      'Ein Leben für die Gerechtigkeit',
      'Video-Porträt',
      null::text,
      null::text,
      'video',
      'https://ik.imagekit.io/mq26ahrml/VictorG_08052026.mp4?updatedAt=1770766503473',
      'https://bilder.deutschlandfunk.de/FI/LE/_3/70/FILE_37094d6d0577fb2093d8e96b3ff84bd9/2630844420-victor-2019-jpg-100-1920x1080.jpg',
      'Treptower Park — May 8, 2025',
      3
    )
) as seed (
  title,
  person,
  role,
  content,
  media_type,
  media_url,
  image_url,
  location_meta,
  sort_order
)
where not exists (select 1 from public.interviews limit 1);
