-- Grammar and consistency fixes for default interview entries
update public.interviews
set
  content = 'A feature interview about the legacy of the Cold War and his pivotal 1952 decision to defect across the Danube.'
where title = 'The Man Who Swam to the East';

update public.interviews
set
  title = 'Victor Grossman: Begegnungen mit Pete Seeger (1979)',
  role = null,
  content = 'Eine historische Sendung mit Victor Grossman über Pete Seeger und die Kraft politischer Lieder.'
where person = 'Berliner Rundfunk'
  and title like '%Pete Seeger%';

update public.interviews
set person = 'Video-Porträt'
where title = 'Ein Leben für die Gerechtigkeit'
  and person = 'Video Portrait';
