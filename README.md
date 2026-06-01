# Reachquix (zone-send)

Email automation platform for cold outreach, campaigns, templates, and contact management.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, edge functions)

## Local development

```sh
npm install
npm run dev
```

The dev server runs at `http://localhost:8080`.

## Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### AI email writer (OpenAI, not Lovable)

Set in Supabase → Edge Functions → Secrets:

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | Required for AI email writer |
| `OPENAI_API_BASE` | Optional (default `https://api.openai.com/v1`) |
| `OPENAI_MODEL` | Optional (default `gpt-4o-mini`) |

```sh
npx supabase functions deploy ai-email-writer
```

## Google sign-in (Supabase)

1. **Authentication → Providers → Google** — enable and add OAuth Client ID/Secret.
2. **Authentication → URL Configuration** — add redirect URLs:
   - `http://localhost:8080/**`
   - `http://127.0.0.1:8080/**`
   - Your production URL + `/**`
3. **Google Cloud Console** — authorized redirect URI:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`

The app uses `supabase.auth.signInWithOAuth` and completes the flow at `/auth/callback`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |
