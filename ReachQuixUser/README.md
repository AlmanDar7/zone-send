# ReachQuix User Portal

Cold email automation platform for campaigns, email templates, form publishing, contact management, and analytics.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Framer Motion
- **Authentication:** Firebase Auth (Email/Password & Google Sign-In)
- **Backend Service:** ReachQuix Express API (`http://localhost:5000/api`) with Prisma ORM & MySQL

## Local Development

```sh
npm install
npm run dev
```

The user portal runs at `http://localhost:8080`.

## Environment Variables

Configured in `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSyBwIKbL1IFPslhOs-HiWQ1FyQvCh1dIGD8
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

API requests to `http://localhost:5000/api` pass the Firebase Bearer token for server-side verification.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |
