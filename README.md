# Vibo Code Analyst

Next.js frontend and API routes for repository analysis, with:

- GitHub OAuth via `next-auth`
- Supabase for app data storage
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

3. In Supabase, open the SQL editor and run [`supabase/schema.sql`](/Users/vibhorsharma/Vibo/Vibo-code-analyst/supabase/schema.sql).

4. Start the app:

```bash
npm run dev
```

The app runs on [http://localhost:3000](http://localhost:3000). This single Next.js server handles both the frontend and backend API routes.

## Required environment variables

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GITHUB_ID`
- `GITHUB_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

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

## Supabase notes

Use the service role key only on the server. The app writes analyses and query history through API routes, not directly from the browser.
