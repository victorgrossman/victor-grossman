-- Bulk insert photos with ImageKit URLs (run in Supabase SQL Editor).
-- Use this if the Node import script cannot insert (e.g. only anon key available):
--   1. Run: node scripts/import-photos.mjs --dry-run   (lists source URLs)
--   2. Temporarily add SUPABASE_SERVICE_ROLE_KEY to .env.local and run without --dry-run
--      OR upload images manually / use ImageKit URLs from script log and paste below.

-- Example (replace with your ImageKit URLs and titles):
/*
INSERT INTO public.photos (title, image_url) VALUES
  ('Victor Grossman 1928 – 2025', 'https://ik.imagekit.io/YOUR_ID/cms/photos/victor2025-1.jpg'),
  ('Another caption', 'https://ik.imagekit.io/YOUR_ID/cms/photos/other.jpg');
*/
