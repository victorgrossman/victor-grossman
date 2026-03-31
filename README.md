This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing

Run all tests:

```bash
npm test
```

Run unit tests only:

```bash
npm run test:unit
```

Run e2e tests only:

```bash
npm run test:e2e
```

## Importing photos (WordPress → ImageKit → Supabase)

1. Copy `.env.local.example` to `.env.local` and add **ImageKit** keys and **`SUPABASE_SERVICE_ROLE_KEY`** (Dashboard → Project Settings → API). Row Level Security only allows authenticated users to insert; the service role bypasses RLS for trusted local scripts.
2. From `victor-grossman` (project folder), run:

   ```bash
   npm run import:photos -- --dry-run   # list images that would be imported
   npm run import:photos -- --max=10     # import first 10 unique images
   npm run import:photos                 # import all unique images from posts
   ```

   Images are taken from [WordPress.com REST API](https://developer.wordpress.com/docs/api/) posts for `victorgrossmansberlinbulletin.wordpress.com` (override with env `WORDPRESS_SITE`). They are resized/compressed with `sharp`, uploaded to ImageKit under `/cms/photos`, then inserted into `public.photos`.

3. If you cannot use the service role, use **`npm run import:photos -- --no-db`** to upload to ImageKit and print `INSERT` lines, then run them in the SQL Editor.

**More images:** Most bulletin posts are text-only, so the API may only find a few pictures. Copy `scripts/photos-sources.example.json` to **`scripts/photos-sources.json`** and add `{ "title", "sourceUrl" }` entries (any direct image URL). Those rows are merged into the import.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
