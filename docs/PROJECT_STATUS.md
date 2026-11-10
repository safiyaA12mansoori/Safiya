# Project status

Date: 2026-11-10. Branch: `cursor/milk-epr-core-platform-42fa`.

## Where the work stands

Phase 1 (core platform) is implemented in this branch. Phase 2 is the audit of that code. On 2026-11-10 the HIGH findings and the database constraints called out before a shared deployment were remediated in the same branch. Business modules are not started. No production host has been provisioned.

The API connects as `milk_app`. Login throttling still fails open if Redis is down, and row-level security is still not enabled. Both are recorded in `docs/DECISION_LOG.md` as D-07.

## What was executed on 2026-11-10

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed. validation, web, and API |
| `pnpm lint` | Passed. ESLint 10.14.0, no findings |
| `pnpm test` | Passed. 4 suites, 13 tests, database `milk_epr_test` as `milk_app`. The persistence test also checks that the session role is not a superuser, that a branch cannot reference another tenant's company, that `milk_app` cannot update `audit_events`, and that an update by the bootstrap role raises `append-only` |
| `pnpm --filter @milk-epr/api build` | Passed |
| `pnpm --filter @milk-epr/web build` | Passed |
| Playwright | Not run |
| Docker Compose | Not run. The role script and both migrations were applied with `psql` and `prisma migrate deploy` to the PostgreSQL 16 cluster already on this machine |

## What was executed on 2026-11-09

| Check | Result |
| --- | --- |
| `pnpm typecheck` | Passed. `@milk-epr/validation`, `@milk-epr/web`, and `@milk-epr/api` |
| `pnpm lint` | Passed. ESLint 10.14.0, zero problems |
| `pnpm test` | Passed. 4 suites, 13 tests, Jest 29, database `milk_epr_test` |
| `pnpm --filter @milk-epr/api build` | Passed. `nest build` |
| `pnpm --filter @milk-epr/web build` | Passed. Next.js 16.4.5 production build |
| Live API smoke against seeded `local` / `admin@example.com` | Login 200, bad password 401, no token 401, company/branch/unit/master create 201, duplicate company 409, dashboard counts from PostgreSQL, audit list without `passwordHash`, OpenAPI JSON 200 with 26 paths, Swagger UI 200 |
| Browser walkthrough of http://127.0.0.1:3000 | Sign-in error text, dashboard counts, create company DEMO, companies list, audit rows, navigation without business modules. Screenshots under the agent media store |
| Playwright | Not run. There is no Playwright suite |
| Docker Compose | Not run. Docker is not installed in the environment that executed the checks. PostgreSQL 16 and Redis 7 were already listening on the Compose ports |

## Remediated on 2026-11-10

- K-01: `DATABASE_URL` is `milk_app`. Migrations use `MIGRATION_DATABASE_URL`.
- K-02: `.env.example` has no bootstrap password. The production seed refusal is unchanged.
- K-06: `audit_events` trigger plus `REVOKE UPDATE, DELETE` from `milk_app`.
- K-07: last-administrator and company-branch checks run inside the write transaction. Company retire and branch create lock the company row. The administrator check locks the system role row.
- K-08: `branches (tenant_id, company_id)` references `companies (tenant_id, id)`.

## Still open

Row-level security (K-05). Login rate limit fails open and is keyed by IP plus email (K-03, K-04). Public OpenAPI on a shared host (K-09). No Playwright suite. Docker Compose was not executed in the agent environment. No business module.

## Implemented

Monorepo, Next.js console, NestJS API, Prisma migrations `20261109140000_init` and `20261110130000_integrity`, Redis for throttling, session cache, and health, authentication, tenant/company/branch, users, RBAC, generic master data, audit, dashboard wired to the API, OpenAPI, seed, tests, README.
