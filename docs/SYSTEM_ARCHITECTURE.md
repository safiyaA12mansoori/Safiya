# System architecture

## Shape

A modular monolith. One NestJS API owns business rules. One Next.js console is a client of that API. Shared request and response contracts live in `packages/validation` as Zod schemas. There is no second place that authorizes a write.

```
apps/web  ->  apps/api  ->  PostgreSQL
                      \->  Redis
packages/validation
infrastructure/   Docker Compose for PostgreSQL 16 and Redis 7
```

Mobile (Expo) and desktop (Tauri) are not created. `packages/ui`, a generated API client, and extra shared packages are not created until a second client needs them.

## Request path

1. The browser posts the sign-in form to a Next.js server action.
2. The server action calls `POST /api/v1/auth/login`.
3. The API checks the tenant, verifies the password, writes a session row, and returns a token. It also sets an HTTP-only cookie on the API origin.
4. The server action stores that token in an HTTP-only cookie on the web origin and redirects to the console.
5. Later pages and actions read the cookie on the server and send `Authorization: Bearer` to the API. The API checks the session in PostgreSQL, then the permission set.

## Modules inside the API

Config, Prisma, Redis, audit, RBAC, auth, organization (tenant, company, branch), users, master data, dashboard, health. Guards are global: authentication first, then permissions. A route with no permission metadata still requires a session unless it is marked public. Public routes are health and login.

## Data

PostgreSQL holds every persistent record, including sessions. Redis holds `milk-epr:session:{tokenHash}` and `milk-epr:login-fail:{ip}:{email}`. Authorization does not trust the Redis session entry: every request loads the session from PostgreSQL and repopulates Redis on a cache miss. If Redis is down, sign-in still works and the rate limit does not.

## Process model

API and web run on the host. Compose starts only the data stores. The API listens on port 3001. The web listens on port 3000. Both read the repository-root `.env` (`scripts/with-env.mjs` for Prisma, the seed, and Next; `loadRootEnv` for the API process).

## Why NestJS 11

NestJS 12 publishes ESM-only packages. Jest 29's CommonJS runtime cannot load them (`import.meta` inside `@nestjs/common`). The API is NestJS 11.2.9, which is CommonJS, with the same guards, pipes, and OpenAPI setup. See the decision log.
