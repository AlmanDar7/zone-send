# Reachquix (zone-send)

Email automation platform for cold outreach, campaigns, templates, and contact management.

## Tech stack

- Vite + React + TypeScript
- **Firebase Authentication** (email/password + Google)
- Supabase (database, storage, edge functions — not used for login)

## Local development

```sh
npm install
npm run dev
```

The dev server runs at `http://localhost:8080`.

## Environment variables

Copy `.env.example` to `.env`:

```env
VITE_SUPABASE_URL=https://gklclznwdhvohaedsfxi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=reachquix-64323.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=reachquix-64323
VITE_FIREBASE_STORAGE_BUCKET=reachquix-64323.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=762504209749
VITE_FIREBASE_APP_ID=1:762504209749:web:7605f5a9703712c7affbdc
VITE_FIREBASE_MEASUREMENT_ID=G-4RS4618LRL
```

## Authentication (Firebase)

All sign-in flows use **Firebase Auth**:

- Email / password (with verification email)
- Google (popup)
- Password reset (Firebase email link)

Supabase receives the **Firebase ID token** on each request so Row Level Security still applies.

### Firebase Console

1. **Authentication → Sign-in method** — enable **Email/Password** and **Google**.
2. **Authentication → Settings → Authorized domains** — add `localhost`.
3. **Authentication → Templates** — customize verification / reset emails if needed.

### Supabase (third-party Firebase auth)

Required so database and edge functions accept Firebase tokens:

1. Dashboard → **Authentication** → **Third-party auth** (or **Sign In / Up** → add integration).
2. Connect Firebase project **`reachquix-64323`**.
3. Ensure users get custom claim `role: authenticated` (see [Supabase Firebase auth docs](https://supabase.com/docs/guides/auth/third-party/firebase-auth)) — use Firebase blocking functions or the `onCreate` admin script from those docs.

For local config, `supabase/config.toml` includes:

```toml
[auth.third_party.firebase]
enabled = true
project_id = "reachquix-64323"
```

### AI email writer

Set `OPENAI_API_KEY` in Supabase Edge Function secrets, then:

```sh
npx supabase functions deploy ai-email-writer
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |
