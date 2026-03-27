# Deployment guide (DevNet)

This project is a single Node server that serves:
- the **Express API** (`/api/*`)
- the **React SPA** (static files in production)

## Required environment variables

- `DATABASE_URL` (Postgres connection string)
- `SESSION_SECRET` (required in production)
- `PORT` (optional; defaults to `5000`)

## Build / start commands

- **Build**: `npm run build`
- **Start**: `npm run start`

The build outputs:
- client assets → `dist/public`
- server bundle → `dist/index.cjs`

## Health check

Use `GET /api/health` for platform health checks.

## Notes about cookies (important)

In production, cookies are set as:
- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true` (only in production)

Most hosting providers terminate TLS at a proxy/load balancer. The server enables `trust proxy` in production so secure cookies work correctly.

## Uploads (CVs / avatars)

Uploads are stored on disk in `uploads/`.

If you deploy on an ephemeral filesystem (common on many free tiers), uploads will be lost on redeploy. For production you should move uploads to object storage (S3/R2/etc.) or use a host with persistent disks.

## Example: Render (Web Service)

- **Environment**: Node
- **Build command**: `npm install && npm run build`
- **Start command**: `npm run start`
- **Env vars**: set `DATABASE_URL`, `SESSION_SECRET`
- **Health check path**: `/api/health`

## Example: Railway

- Add a Postgres plugin/service and copy its connection string into `DATABASE_URL`
- **Build**: `npm run build`
- **Start**: `npm run start`
- Set `SESSION_SECRET`

## Example: Docker (optional)

You can run it behind any reverse proxy as long as:
- `DATABASE_URL` points at reachable Postgres
- `SESSION_SECRET` is set
- port `PORT` is exposed/mapped

