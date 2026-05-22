# grepit Code Analyst

Next.js frontend and API routes for repository analysis, with:

- GitHub OAuth via `next-auth`
- PostgreSQL for app data storage
- Drizzle for schema and query access
- Optional Groq enrichment for deeper summaries

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and fill in real values:

```bash
cp .env.example .env.local
```

3. Create a Neon Postgres database and put its pooled connection string in `DATABASE_URL`.

4. Generate and apply the Drizzle migration:

```bash
npm run db:generate
npm run db:migrate
```

5. Start the app:

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000). This single Next.js server handles both the frontend and backend API routes.

## Required environment variables

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `DATABASE_URL`

## GitHub OAuth app setup

Create an OAuth App in GitHub:

1. Go to GitHub Settings -> Developer settings -> OAuth Apps -> New OAuth App.
2. Set `Homepage URL` to `http://localhost:3000`.
3. Set `Authorization callback URL` to `http://localhost:3000/api/auth/callback/github`.
4. Copy the client ID into `GITHUB_ID`.
5. Copy the client secret into `GITHUB_SECRET`.
6. Set `NEXTAUTH_URL=http://localhost:3000`.
7. Generate a long random `NEXTAUTH_SECRET`.

The app requests `read:user user:email repo` so private repository analysis works after sign-in.

## Database notes

The app now talks to plain PostgreSQL through Drizzle. Neon is the recommended low-cost starting host, but any standard Postgres provider works as long as `DATABASE_URL` points to it.

For the exact migration/setup flow and current tables, see [NEON_DRIZZLE_SETUP.md](/Users/vibhorsharma/Vibo/Vibo-code-analyst/NEON_DRIZZLE_SETUP.md).
