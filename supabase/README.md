# Supabase SQL setup

## 1. Schema (once)

Run [`migrations/0001_complete_schema.sql`](./migrations/0001_complete_schema.sql) in the Supabase SQL Editor.

## 2. Data (content import)

Run every file in [`transfer-chunks/`](./transfer-chunks/) **in numeric order** (see `transfer-chunks/README-RUN-ORDER.txt`).

Optional checks: [`diagnostics-rls-and-data.sql`](./diagnostics-rls-and-data.sql).

## German translations

Article and bulletin German text is stored in `content_translations`. The admin CMS can auto-translate on save (via `google-translate-api-x`) or you can edit German fields manually. The public site only reads from the database.

Backfill existing content:

```bash
npm run backfill:translations:test   # first 3 items
npm run backfill:translations        # all bulletins + articles
```

## Regenerate chunks from live DB

```bash
node scripts/export-supabase-to-sql.mjs
```
