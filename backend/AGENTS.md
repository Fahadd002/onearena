# OneArena — Backend

This directory is the NestJS + Prisma API of the OneArena turf booking platform.

**Read `../AGENTS.md` first.** It contains the repository-wide rules, the shared API response
contract, and the frontend conventions.

## Quick reference

- Stack: NestJS 12, Prisma 7 + PostgreSQL (`@prisma/adapter-pg`), better-auth, Stripe, Cloudinary,
  zod, `http-status`, npm. Strict TypeScript with **relative imports only** (no path alias).
- Modules: `src/app/modules/<domain>/` with `.controller.ts`, `.service.ts`, `.module.ts`.
- Controllers mount the full path (`@Controller('api/v1/...')`) and reply via `sendResponse`.
- Guarded routes need `@AuthRoles(UserRole.X)` + `@UseGuards(CheckAuthGuard)`; read the caller with
  `@CurrentUser()`.
- Always throw `AppError` from `src/config/errorHelpers/AppError.ts`; `GlobalExceptionFilter`
  renders the standard `{ success, message, meta, data }` envelope.
- Use the shared Prisma client from `src/shared/prisma.ts` and `QueryBuilder`
  (`src/app/utils/QueryBuilder.ts`) for list queries. Never hand-edit `src/generated/prisma/**`.
- Secrets come from `src/config/index.ts` only.
- Commands: `npm run dev`, `npm run build`, `npm run lint`, `npm run db:generate`, `npm run db:studio`.