# Database audit

Date: 2026-11-09. Schema: `apps/api/prisma/schema.prisma`. Migration: `apps/api/prisma/migrations/20261109140000_init`. Applied to `milk_epr` and `milk_epr_test` with `prisma migrate deploy` before the tests. No destructive checks were run.

## Relations — PASSED

Every structural foreign key is present: company and branch to tenant, branch to company, user to tenant, session to tenant and user, role to tenant, role-permission and user-role links, unit and master record and audit event to tenant, audit actor to user. `created_by` and `updated_by` are real nullable foreign keys to `users`, `ON DELETE RESTRICT`. Link rows cascade when a role or user is deleted. Other foreign keys restrict.

## Keys and uniqueness — PASSED, with K-10

Primary keys are UUID with `DEFAULT gen_random_uuid()`. Uniques: tenant slug; company `(tenant_id, code)`; branch `(company_id, code)`; user `(tenant_id, email)`; session `token_hash`; permission `key`; role `(tenant_id, name)`; user-role `(user_id, role_id)`; unit `(tenant_id, code)`; master record `(tenant_id, record_type, code)`.

A live `POST /companies` with a repeated code returned 409 `CONFLICT`. The same constraint covers a retired row, so a code cannot be reused (K-10, LOW, intentional under D-03).

## Indexes — PASSED for this data size

Indexes match the list and audit queries: tenant status, company tenant+status, branch tenant+company, user tenant+status, session tenant and user+revoked, role-permission by permission, user-role by tenant and role, master record by tenant+type, audit by tenant+time and tenant+entity. Offset pagination will need keyset pagination later. That is not a defect at this volume. LOW, not given its own issue id beyond the remediation note.

## Organization isolation — MEDIUM (K-05, K-08)

There is no `ENABLE ROW LEVEL SECURITY` and no policy. Isolation is `tenantId` on each query. The persistence test creates a second tenant and expects an empty list and a 404 on the first tenant's company, and it expects that tenant cannot create a branch on the other tenant's company. That test passed.

A branch stores `tenant_id` and `company_id` as independent foreign keys. Nothing in the database says the company belongs to that tenant. `BranchService.create` loads the company with `tenantId` and `status: ACTIVE` before insert. A future query that forgets the predicate would not be stopped by Postgres.

## Migrations — PASSED

One migration, generated from the schema after UUID and `updated_at` defaults were set to database defaults. `migrate deploy` applied it to both databases. Tests run `migrate deploy` in global setup and reported no pending migrations. Schema was not edited by hand in the database.

## Transactions — PASSED for the write paths that use them, MEDIUM for two checks (K-07)

Creates and updates of companies, branches, users, roles, units, and master records write the row and the audit event in one Prisma transaction. Password change updates the hash and revokes other sessions in one transaction.

`assertAdministratorRemains` and the company branch-count check run before that transaction. Two concurrent requests can both observe "one admin remains" or "no branches" and then both write. Not observed in the tests, which are serial.

## Integrity — PASSED where constrained

Enums are `record_status` (`ACTIVE`, `INACTIVE`). Passwords are not stored in the clear. Audit payloads used by the user service go through `publicUser`, which omits `passwordHash`. The live audit list did not contain `passwordHash` or the bootstrap password.

## Duplicate risk — PASSED for codes, LOW residual

The unique constraints above are the duplicate control. Soft-deleted rows still occupy the code. Two companies in one tenant cannot share a code. Two companies may each have a branch named `HQ`, because branch uniqueness is per company. That matches the model.

## Soft delete — PASSED as designed

Company, branch, unit, and master-record retire set `deleted_at` and `status = INACTIVE` in one transaction and write `*.retired`. Lists filter `deleted_at: null`. Company retire counts non-deleted branches first (see the race in K-07). Users are disabled (`INACTIVE`) rather than given a retire route. Sessions use `revoked_at`, not `deleted_at`. Audit rows have no delete path in the API and no database privilege stopping a superuser (K-06, MEDIUM).

## Roles — HIGH (K-01)

The Compose file and the local cluster use role `milk`, created as a superuser by the PostgreSQL image's default. That role can update or delete audit rows and bypass any future grant. Acceptable only on a private development machine.
