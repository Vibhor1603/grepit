# Neon + Drizzle Setup

This app now uses plain PostgreSQL through Drizzle instead of the Supabase JS client.

## What Neon Is

- Neon hosts your PostgreSQL database.
- It gives you a `DATABASE_URL`.
- Later, you can move to any PostgreSQL host by changing that one URL and migrating data.

## What Drizzle Is

- Drizzle is the app-side schema and query layer.
- It defines tables in code.
- It generates and runs migrations.
- The app talks to PostgreSQL through Drizzle.

## Setup Steps

1. Create a Neon project.
2. In Neon, create or open your database.
3. Copy the pooled PostgreSQL connection string.
4. Put it in `.env.local` as:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

5. Install dependencies:

```bash
npm install
```

6. Generate the migration from the Drizzle schema:

```bash
npm run db:generate
```

7. Apply the migration to Neon:

```bash
npm run db:migrate
```

8. Start the app:

```bash
npm run dev
```

## Tables In Use

The app currently needs exactly two tables.

### `analyses`

Purpose:
- stores one repository analysis record
- stores the final summarized analysis payload
- stores status during processing

Fields:
- `id`
- `owner_email`
- `repo_url`
- `repo_name`
- `source`
- `status`
- `summary`
- `total_files`
- `total_lines`
- `is_private`
- `error_message`
- `languages`
- `file_tree`
- `architecture`
- `results`
- `created_at`
- `updated_at`

Notes:
- `languages`, `file_tree`, `architecture`, and `results` are JSONB
- `results` is the largest payload in the system

### `query_history`

Purpose:
- stores recent questions and answers tied to an analysis

Fields:
- `id`
- `analysis_id`
- `owner_email`
- `query`
- `response`
- `created_at`

## Current Schema Direction

This migration keeps the existing functionality and schema shape.

That means:
- no behavior changes
- no route contract changes
- no UI data shape changes

## Schema Discussion Points

These are the next decisions worth discussing before we optimize further:

1. Should `results` stay as one large JSONB document, or should we split heavy artifacts into separate tables?
2. Should `repo_url + owner_email` be unique for the latest active analysis, or should we continue allowing multiple snapshots?
3. Should `query_history` keep full response text forever, or should we add retention limits?
4. Should we add a separate `analysis_files` table later if analysis payload size keeps growing?
