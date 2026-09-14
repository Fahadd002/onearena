# OneArena Backend (NestJS)

Express API migrated to NestJS. Same routes, auth, and database behavior — frontend needs no changes.

## What to install

```bash
cd backend
npm install
```

Main packages:

| Package | Purpose |
|---------|---------|
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | NestJS framework |
| `better-auth` | Auth sessions / OAuth / OTP |
| `@prisma/client`, `@prisma/adapter-pg`, `pg` | Database |
| `jsonwebtoken`, `cookie-parser`, `cors`, `ejs`, `nodemailer` | JWT cookies, CORS, email templates |

Also ensure `.env` exists (same variables as before: `DATABASE_URL`, `PORT`, `BETTER_AUTH_*`, JWT secrets, SMTP, Google OAuth, etc.).

## Setup & run

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # apply migrations (if needed)
npm run start:dev     # development (watch)
# or
npm run build && npm start
```

Server: `http://localhost:5000` (or your `PORT`).

## How it works

```
Request
  → CORS + cookies
  → /api/auth/*        → better-auth (mounted on Express)
  → /api/v1/auth/*     → Nest AuthController → AuthService
  → CheckAuthGuard     → session cookie + JWT + roles (protected routes)
  → GlobalExceptionFilter → same error JSON shape as before
```

### Structure (important parts)

- `src/main.ts` — bootstrap: CORS, EJS, better-auth, body parsers, filters
- `src/app.module.ts` — root module
- `src/app/modules/auth/` — Auth controller, service, module
- `src/common/guards/` — `CheckAuthGuard` (was Express `checkAuth`)
- `src/common/filters/` — global error handler
- `src/app/lib/auth.ts` — better-auth config (unchanged logic)
- `src/shared/prisma.ts` — Prisma + Postgres pool
- `prisma/` — schema & migrations

### API (unchanged)

| Method | Path |
|--------|------|
| GET | `/` |
| * | `/api/auth/*` |
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/refresh-token` |
| GET | `/api/v1/auth/me` |
| POST | `/api/v1/auth/change-password` |
| POST | `/api/v1/auth/logout` |
| POST | `/api/v1/auth/verify-email` |
| POST | `/api/v1/auth/forget-password` |
| POST | `/api/v1/auth/reset-password` |
| GET | `/api/v1/auth/login/google` |
| GET | `/api/v1/auth/google/success` |
| GET | `/api/v1/auth/oauth/error` |

Auth uses dual cookies: `better-auth.session_token` + `accessToken` / `refreshToken`.

## Quick test

```bash
curl http://localhost:5000/
curl http://localhost:5000/api/auth/ok
curl http://localhost:5000/api/v1/auth/me
```

Expect health `201`, better-auth `ok`, and `401` on `/me` without cookies.
