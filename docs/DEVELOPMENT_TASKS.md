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

## Required before a shared deployment

1. Replace the superuser database role with a role that can use the schema and cannot change ownership or read other databases. Add a privilege or trigger so `audit_events` cannot be updated or deleted by the application role.
2. Remove any use of the example bootstrap password. Keep the production seed refusal.
3. Decide fail-closed behavior for login throttling when Redis is unavailable, and throttle by source address as well as by account.
4. Restrict `/api/docs` and `/api/docs-json` on any shared host.
5. Add a composite foreign key or trigger so a branch cannot name a company in another tenant.

## Required before the first business module

1. Owner names the module. Until then, do not add CRM, sales, or the others.
2. If that module posts stock, design the inventory ledger first.
3. If that module posts money, design the balanced finance ledger first. Do not add money columns to the current tables as a shortcut.
4. Add automated browser coverage for sign-in and one create path. The manual walkthrough is not a suite.

## Explicitly not a task yet

SSO, MFA, mobile, desktop, translation tables, tenant self-service provisioning, platform-operator administration, partial unique indexes that reuse retired codes.
