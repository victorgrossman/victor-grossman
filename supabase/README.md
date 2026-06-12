# Supabase SQL setup

## 1. Schema (once)

Run [`migrations/0001_complete_schema.sql`](./migrations/0001_complete_schema.sql) in the Supabase SQL Editor.

## 2. Data (content import)

Run every file in [`transfer-chunks/`](./transfer-chunks/) **in numeric order** (see `transfer-chunks/README-RUN-ORDER.txt`).

Optional checks: [`diagnostics-rls-and-data.sql`](./diagnostics-rls-and-data.sql).

## Regenerate chunks from live DB

```bash
node scripts/export-supabase-to-sql.mjs
```
