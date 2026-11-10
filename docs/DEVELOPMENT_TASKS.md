# Development tasks

## Done in this branch

- Monorepo: `apps/web`, `apps/api`, `packages/validation`, `infrastructure/`, `scripts/with-env.mjs`.
- Prisma schema and migration `20261109140000_init`. UUID default `gen_random_uuid()`. `updated_at` default `CURRENT_TIMESTAMP`.
- Seed for one tenant, the permission catalogue, Administrator and Reader, and one admin.
- Auth, RBAC, organization, users, master data, audit, dashboard, health, OpenAPI.
- Web console pages for those resources, calling the API.
- Jest unit tests and Supertest API tests, executed.
- ESLint flat config, executed.
- Architecture docs and the Phase 2 audit docs.
- Migration `20261110130000_integrity`: composite branch foreign key, append-only audit trigger, grants for `milk_app`.
- Last-administrator and company-branch checks moved into the write transaction, with row locks.
- Bootstrap password removed from `.env.example`.

## Required before a shared deployment

1. Decide fail-closed behavior for login throttling when Redis is unavailable, and throttle by source address as well as by account. Left open on purpose (D-07).
2. Restrict `/api/docs` and `/api/docs-json` on any shared host.
3. Replace the local `milk_app` password and stop using the bootstrap superuser for migrations. No production host exists yet.
4. Row-level security, if a shared deployment needs a database backstop in addition to the application `tenant_id` predicates (D-07).

## Required before the first business module

1. Owner names the module. Until then, do not add CRM, sales, or the others.
2. If that module posts stock, design the inventory ledger first.
3. If that module posts money, design the balanced finance ledger first. Do not add money columns to the current tables as a shortcut.
4. Add automated browser coverage for sign-in and one create path. The manual walkthrough is not a suite.

## Explicitly not a task yet

SSO, MFA, mobile, desktop, translation tables, tenant self-service provisioning, platform-operator administration, partial unique indexes that reuse retired codes.
