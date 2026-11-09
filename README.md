# Milk EPR

Core enterprise platform for Milk ERP. This repository started as an empty checkout (`README` title only) and the application lives at the repository root.

Phase 1 implements the core platform only: authentication, tenant, company, and branch records, users, roles and permissions, generic master data, audit, a web console, and the OpenAPI description. CRM, sales, and the other business modules are not implemented.

## Local setup

Requirements: Node.js 22, pnpm 10, and Docker.

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web console: http://localhost:3000
- API: http://localhost:3001
- OpenAPI UI: http://localhost:3001/api/docs

The dev seed creates one tenant and one administrator. It does not create companies, branches, units, or master records. The example credentials in `.env.example` are for local development only. Re-running the seed does not reset that password.

Sign in with the tenant slug, email, and password from `.env`.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

API tests use the database named `milk_epr_test` on the same PostgreSQL server. Docker's first-time init script creates that database. They refuse to run against a database whose name does not end in `_test`.

## Assumptions in this milestone

Tenant, company, and branch are different records. See `docs/DECISION_LOG.md`. The API is the only place that enforces permissions and tenant isolation.
