# ReachQuix Admin Panel

Administrative management dashboard for ReachQuix platform analytics, user management, and system monitoring.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query
- **Authentication:** Firebase Auth
- **Backend Service:** ReachQuix Express API (`http://localhost:5000/api/admin`) with Prisma ORM & MySQL

## Local Development

```sh
npm install
npm run dev
```

The admin panel runs at `http://localhost:8081`.

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
