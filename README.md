# Milk EPR

Core enterprise platform for Milk ERP. This repository started as an empty checkout (`README` title only) and the application lives at the repository root.

Phase 1 implements the core platform only: authentication, tenant, company, and branch records, users, roles and permissions, generic master data, audit, a web console, and the OpenAPI description. CRM, sales, and the other business modules are not implemented.

## Local setup

Requirements: Node.js 22, pnpm 10, and PostgreSQL 16. Docker Compose is the usual way to start PostgreSQL and Redis. This repository does not provision a production host.

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml up -d
pnpm install
```

Compose creates a bootstrap superuser named `milk` because that is how the PostgreSQL image works. A fresh volume also runs `infrastructure/postgres/app-role.sql`, which creates `milk_app`. That role is not a superuser. The API uses it through `DATABASE_URL`. `pnpm db:migrate` uses `MIGRATION_DATABASE_URL`, which points at the bootstrap account on a local machine. Do not point the API at the bootstrap account.

If the databases already exist and the role script has not run, apply it once as the bootstrap user:

```bash
psql "postgresql://milk:milk@localhost:5432/postgres" -f infrastructure/postgres/app-role.sql
```

Set a bootstrap password in `.env` before seeding. It is not in `.env.example`. Use at least 12 characters, and do not commit the file.

```bash
# in .env
BOOTSTRAP_ADMIN_PASSWORD='choose-a-local-password'
```

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web console: http://localhost:3000
- API: http://localhost:3001
- OpenAPI UI: http://localhost:3001/api/docs

The seed creates one tenant and one administrator. It does not create companies, branches, units, or master records. Running it again does not change the password. `NODE_ENV=production` refuses the seed unless `ALLOW_BOOTSTRAP=true`.

Sign in with the tenant slug, email, and password from your `.env`.

API tests use `milk_app` on `milk_epr_test`. They still migrate with the local bootstrap account, and they refuse a database name that does not end in `_test`. Create that database and role before `pnpm test`. The Compose init script does both on a new volume.

## Checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Assumptions in this milestone

Tenant, company, and branch are different records. See `docs/DECISION_LOG.md`. The API is the only place that enforces permissions and tenant isolation.
