# DevNet (DevShare-Platform)

DevNet is a full-stack platform for developers and employers: community posts, job listings + applications, direct messages, notifications, and an admin dashboard.

## Tech stack

- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: Express + TypeScript
- **Auth**: Passport (local) + server sessions stored in Postgres
- **DB**: PostgreSQL + Drizzle ORM

## Project structure

- `client/` — React app
- `server/` — Express API + auth + static serving
- `shared/` — Drizzle schema + shared types/validation
- `script/` — build + utilities

## Setup

1. Install deps:

```bash
npm install
```

2. Create your env file:

```bash
copy .env.example .env
```

3. Fill in `DATABASE_URL` and `SESSION_SECRET` in `.env`.

## Run (development)

```bash
npm run dev
```

Server starts on `http://127.0.0.1:5000` by default.

## Database

Push schema to DB:

```bash
npm run db:push
```

Create an admin user:

```bash
npm run create-admin
```

## Checks

- Typecheck: `npm run check`
- Lint: `npm run lint`
- Format: `npm run format`
- Smoke test (server must be running): `npm run test:smoke`

## Production build

```bash
npm run build
npm run start
```

The build outputs:
- client assets to `dist/public`
- server bundle to `dist/index.cjs`

