# Database design

PostgreSQL 16. Schema owned by Prisma (`apps/api/prisma/schema.prisma`). Changes ship as migrations in `apps/api/prisma/migrations`. The initial migration is `20261109140000_init`.

## Organization

These three are not interchangeable. The decision log records this as the assumption that was implemented.

- **Tenant** (`tenants`): isolation boundary. Unique `slug`. A session belongs to one tenant.
- **Company** (`companies`): legal entity inside one tenant. Unique `(tenant_id, code)`.
- **Branch** (`branches`): operating location of one company. Unique `(company_id, code)`. `tenant_id` is stored so lists do not need to join through the company, and the API sets it from the session after checking the company.

No financial books. No dairy org units. No cost centers.

## Identity

- `users`: unique `(tenant_id, email)`. `password_hash` only. Status `ACTIVE` or `INACTIVE`. `deleted_at` for retirement. Phase 1 user administration disables and resets passwords; it does not expose a separate delete.
- `sessions`: random token stored as SHA-256 hex (`token_hash` unique). `expires_at`, `revoked_at`.
- `permissions`: global catalogue, unique `key`.
- `roles`: unique `(tenant_id, name)`. `is_system` marks Administrator and Reader.
- `role_permissions` and `user_roles`: link tables. Deleting a role or a user cascades the links. Permissions are not cascaded away.

## Master data and audit

- `units_of_measure`: unique `(tenant_id, code)`.
- `master_records`: unique `(tenant_id, record_type, code)`. `record_type` is a tenant-defined string, not a lookup table.
- `audit_events`: append-only in the application. Indexed by `(tenant_id, created_at)` and `(tenant_id, entity_type, entity_id)`.

## Integrity rules in the schema

- Primary keys are UUID, default `gen_random_uuid()`.
- `created_at` and `updated_at` default to `CURRENT_TIMESTAMP`. Prisma also maintains `updated_at`.
- `created_by` and `updated_by` are nullable foreign keys to `users` with `ON DELETE RESTRICT`.
- Structural foreign keys use `ON DELETE RESTRICT`, except the two link tables above.
- Soft delete is `deleted_at`. Retired companies, branches, units, and master records also become `INACTIVE`. Unique constraints include retired rows, so a code cannot be reused.
- There is no row-level security policy. Isolation is a `tenant_id` predicate in the API. Row-level security is a follow-up, recorded in the decision log, because it needs a session variable and a policy on every table.
- `companies` has a unique key on `(tenant_id, id)`. `branches` references that pair, so a branch cannot point at a company in another tenant. The single-column company foreign key was replaced in migration `20261110130000_integrity`.
- `audit_events` has a `BEFORE UPDATE OR DELETE` trigger, `audit_events_append_only`, that raises an exception. The application role also has no `UPDATE` or `DELETE` on that table. A superuser can disable the trigger. The API is not that superuser.

## Local databases

`milk_epr` is the development database. `milk_epr_test` is the test database. Tests refuse a database name that does not end in `_test`. Docker's init script creates the test database on a fresh volume and runs `infrastructure/postgres/app-role.sql`.

Two local roles:

- `milk` is the cluster bootstrap account. Compose's `POSTGRES_USER` is a superuser because the PostgreSQL image makes it one. `MIGRATION_DATABASE_URL` uses it so Prisma can create tables. It is not the API connection, and it is not a production role. No production host has been provisioned.
- `milk_app` is `NOSUPERUSER`, `NOCREATEDB`, and `NOCREATEROLE`. `DATABASE_URL` uses it. It can `SELECT`, `INSERT`, `UPDATE`, and `DELETE` business tables, including the link tables the role and user screens rewrite. On `audit_events` it can only `SELECT` and `INSERT`. It cannot read or write `_prisma_migrations`.

The local password for `milk_app` is in `.env.example` because this is a private development database. Replace it before any shared deployment.
