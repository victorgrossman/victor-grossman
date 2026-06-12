# Victor Grossman Memorial Website

Digital archive and tribute dedicated to **Victor Grossman (1928–2025)** — biography, eulogies, interviews (audio/video), photo gallery, wall of memories, books, Berlin bulletins, articles, and films.

Built with **Next.js 15** (App Router), **Supabase**, **ImageKit**, and **Tailwind CSS v4**. Deployed on **Vercel**.

---

## 1. Project Overview

**Purpose:** Memorial site with bilingual (EN/DE) public content, user-submitted memories, and an admin CMS.

**Main functionality:**

- Public single-page site with English/German toggle (default **English**)
- Dynamic content from Supabase (photos, tributes, books, articles, bulletins, interviews)
- Bilingual articles and bulletins via cached database translations (`content_translations`)
- User-submitted memories (pending → admin approval)
- Admin CMS at `/admin`
- Import and backfill scripts (WordPress / Wechsler archive → ImageKit → Supabase)
- Performance: lazy-loaded article/bulletin bodies, code-split readers/modals, optimized images (`next/image`)

---

## 2. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15.5.14 (App Router) + TypeScript + React 18 |
| Backend | Supabase (PostgreSQL + Auth; Edge Functions ready, none deployed) |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix UI + Lucide |
| Deployment | Vercel |
| Media CDN | ImageKit (upload, resize, CDN — not Supabase Storage) |
| Forms / validation | React Hook Form + Zod |
| Admin tables | TanStack Table |
| Rich text (admin) | TipTap |
| Toasts / theme | Sonner, next-themes |
| Translation (admin) | `google-translate-api-x` (on save / auto-translate buttons) |
| Translation (public) | Reads from `content_translations` only — no live API |
| Images (public) | `next/image` via `VictorImage` (AVIF/WebP) |
| Testing | Vitest (unit) + Playwright (e2e) |
| Image processing | sharp, browser-image-compression |

---

## 3. Repository

- **URL:** https://github.com/victorgrossman/victor-grossman.git
- **Branch:** `main` (production)

```bash
git clone https://github.com/victorgrossman/victor-grossman.git
cd victor-grossman
npm install
```

---

## 4. Local Development

```bash
npm install
# Create .env.local (see section 5)
npm run dev          # http://localhost:3001
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port **3001** |
| `npm run dev:3000` | Dev on port 3000 (used by Playwright e2e) |
| `npm run build` | Production build |
| `npm run start:3001` | Serve production build |
| `npm test` | Unit + e2e tests |
| `npm run test:unit` | Vitest only |
| `npm run test:e2e` | Playwright only |
| `npm run backfill:translations` | Backfill EN↔DE translations for articles/bulletins |
| `npm run backfill:translations:test` | Backfill first 3 items (smoke test) |

---

## 5. Environment Variables

Create `.env.local` in the project root:

```env
# Supabase — Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable/anon key>

# Server-side only — import scripts + CMS server actions
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# ImageKit — Dashboard → Developer → API keys
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<id>
IMAGEKIT_PUBLIC_KEY=<public key>
IMAGEKIT_PRIVATE_KEY=<private key>
IMAGEKIT_CMS_ROOT=cms
```

**Notes:**

- No translation API keys are required for the **public** site.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — use only in trusted local scripts and on Vercel for admin server actions.
- Optional import overrides: `WORDPRESS_SITE`, etc. (see import scripts below).

---

## 6. Supabase Configuration

See also [`supabase/README.md`](supabase/README.md).

### Database tables

| Table | Purpose |
| --- | --- |
| `photos` | Archive gallery (`status`: pending/approved/rejected) |
| `tributes` | Wall of memories (`status`: pending/approved/rejected) |
| `books` | Book catalog + optional `amazon_url` |
| `articles` | Articles/films (`is_published`, `category`, `wp_post_id`) |
| `bulletins` | Berlin bulletins archive (2017–2025) |
| `interviews` | Audio/video interviews (`media_type`, `media_url`, `sort_order`) |
| `content_translations` | Cached EN/DE translations for articles and bulletins |

> There is no `memories` table — the UI maps approved `tributes` to “memories”.

**Schema sources:**

- New project: [`supabase/new-project-schema.sql`](supabase/new-project-schema.sql)
- Migrations: [`supabase/migrations/`](supabase/migrations/)
- Data import: [`supabase/transfer-chunks/`](supabase/transfer-chunks/) (run in numeric order)
- RLS fixes: [`supabase/fix-rls-all-sections.sql`](supabase/fix-rls-all-sections.sql)

### Authentication

- Supabase Auth (email/password)
- **Login route:** `/login` (legacy `/admin/login` redirects here)
- **Protected routes:** `/admin/*` via [`middleware.ts`](middleware.ts) and `@supabase/ssr`
- Store admin credentials in a password manager — do not commit them to the repo

### Storage

Not used — all media goes to **ImageKit**.

### Row Level Security (RLS)

- Enabled on all tables
- Public read for published/approved content
- Writes restricted to authenticated admin users
- Service role bypasses RLS for import scripts

### Translations

- Admin can enter German fields manually or use **Auto-translate** on save
- English bulletins → German stored in `content_translations`
- German-source articles → English stored in `content_translations`
- Backfill existing content: `npm run backfill:translations`

### Edge Functions

None currently deployed.

---

## 7. Folder Structure

```
src/app/                  App Router routes (/, /login, /admin/*)
src/components/
  victor/                 Public memorial UI (App, cards, readers, modals)
  admin/                  Admin-only components (rich text editor)
  ui/                     shadcn/ui primitives
src/lib/
  victor/                 Supabase client, site-data loaders
  content-translations/   Fetch, resolve, server upsert
  translation/            translate-text, detect-lang
  imagekit.ts             ImageKit helpers
  amazon-url.ts           Amazon link validation
supabase/                 Schema, migrations, SQL scripts
scripts/                  Import, scrape, backfill scripts
tests/e2e/                Playwright tests
middleware.ts             Auth + admin route protection
```

---

## 8. Key Features & Pages

### Public site (`/`)

Single-page app in `src/components/victor/App.tsx`.

| Section | EN | DE | Notes |
| --- | --- | --- | --- |
| Hero / Home | Home | Start | Optimized hero image |
| Biography | About | Über | Static copy in `copy.ts` |
| Funeral | Funeral | Trauerfeier | Eulogies |
| Books | Books | Bücher | Amazon purchase link when `amazon_url` is set |
| Bulletins | Blogs | Berichte | Year filter 2017–2025, full archive view |
| Films | Films | Filme | Articles with film/video category |
| Articles | Articles | Artikel | Dedicated articles view |
| Photos | Photos | Fotos | Masonry gallery + fullscreen |
| Memories | Memories | Erinnerungen | Public tribute form → `tributes` (pending) |
| Interviews | Interviews | Interviews | Audio/video players |

Default language: **English**. Toggle in the navbar.

### Admin (`/admin`)

| Route | Manages |
| --- | --- |
| `/admin` | Dashboard |
| `/admin/photos` | Photo moderation |
| `/admin/books` | Books + Amazon URL |
| `/admin/tributes` | Approve/reject memories |
| `/admin/articles` | Articles + translation fields |
| `/admin/bulletins` | Bulletins + translation fields |
| `/admin/interviews` | Interview media |

---

## 9. Import Scripts

### Photos (WordPress → ImageKit → Supabase)

1. Add ImageKit keys and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
2. Run from the project root:

   ```bash
   npm run import:photos -- --dry-run   # list images that would be imported
   npm run import:photos -- --max=10    # import first 10 unique images
   npm run import:photos                # import all unique images from posts
   ```

   Images are taken from the [WordPress.com REST API](https://developer.wordpress.com/docs/api/) for `victorgrossmansberlinbulletin.wordpress.com` (override with `WORDPRESS_SITE`). They are resized with `sharp`, uploaded to ImageKit under `/cms/photos`, then inserted into `public.photos`.

3. Without the service role: `npm run import:photos -- --no-db` uploads to ImageKit and prints `INSERT` lines for the SQL Editor.

**More images:** Copy `scripts/photos-sources.example.json` to `scripts/photos-sources.json` and add `{ "title", "sourceUrl" }` entries.

### Other scripts

| Script | Purpose |
| --- | --- |
| `npm run import:articles:wp` | Import articles from WordPress |
| `npm run import:articles:wechsler` | Import articles from Wechsler archive |
| `npm run import:tributes:wechsler` | Import tributes/memories |
| `npm run import:photos:wechsler` | Import photos from Wechsler archive |
| `npm run scrape:books` | Scrape book data |
| `npm run sync:memorial` | Full memorial sync (books, tributes, articles, photos) |
| `npm run imagekit:init-folders` | Create ImageKit CMS folders |

---

## 10. Deployment (Vercel)

- **Preview/production URL:** `victor-grossman-delta.vercel.app`
- Push to `main` → Vercel auto-deploys
- Set all environment variables in Vercel → Settings → Environment Variables
- Custom domain: Vercel → Domains

---

## 11. Maintenance

| Task | How |
| --- | --- |
| Dependencies | `npm outdated` → `npm update` |
| Database backup | Supabase → Database → Backups (daily) |
| Image assets | Permanent on ImageKit |
| Translations | `npm run backfill:translations -- --only-missing` after bulk content changes |
| Amazon links | Add per book in Admin → Books |
| Tests | `npm test` |
| Logs | Vercel Analytics, Supabase logs, browser console |

---

## 12. Credentials & Access

Store all credentials in a password manager. Do not commit secrets to the repo.

| Service | Access | Notes |
| --- | --- | --- |
| Supabase | Dashboard login | Project API keys in `.env.local` |
| ImageKit | OAuth | Dashboard → API keys |
| Vercel | OAuth | Project settings + env vars |
| GitHub | OAuth | `victorgrossman/victor-grossman` |
| Website admin | `/login` | Supabase Auth user |

---

## Testing

```bash
npm test              # unit + e2e
npm run test:unit     # Vitest (src/lib/*.test.ts)
npm run test:e2e      # Playwright (tests/e2e/) — starts dev server on port 3000
```
