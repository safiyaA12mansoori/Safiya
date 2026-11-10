# Phase 2 remediation plan

Ordered by what would matter if this left a single private machine. None of these items require replacing the working controllers.

## Done on 2026-11-10

1. **K-01 HIGH.** `DATABASE_URL` is `milk_app` (`NOSUPERUSER`). `MIGRATION_DATABASE_URL` is the local bootstrap account, used only by `scripts/migrate.mjs`. Role script: `infrastructure/postgres/app-role.sql`. Grants are in migration `20261110130000_integrity`. `milk_app` also has `DELETE` on business tables because role and user assignment replaces link rows. It does not have `UPDATE` or `DELETE` on `audit_events`.
2. **K-02 HIGH.** `.env.example` no longer contains `BOOTSTRAP_ADMIN_PASSWORD`. The seed still refuses `NODE_ENV=production` unless `ALLOW_BOOTSTRAP=true`, and it tells the operator to set the password in the gitignored `.env`.
3. **K-06 MEDIUM.** Both the revoke and a `BEFORE UPDATE OR DELETE` trigger. The trigger also blocks the table owner. A superuser can disable it. The API role cannot.
4. **K-08 MEDIUM.** Unique `(tenant_id, id)` on `companies`. `branches (tenant_id, company_id)` references it. The old single-column company foreign key was dropped.
5. **K-07 MEDIUM.** The last-administrator check locks the system Administrator role and runs inside the user update or role-replacement transaction. Company retire locks the company, counts branches, and retires in that same transaction. Branch create locks the same company row before insert, because a soft-deleted company still satisfies a foreign key.

## Before any shared deployment

1. **K-09 LOW, promoted for a shared host.** Serve OpenAPI only to authenticated administrators, or do not expose it.
2. Replace the local database passwords. Do not reuse the bootstrap superuser. No production host has been provisioned.

## Next, still before a business module

3. **K-03, K-04 MEDIUM.** Left open. See D-07. When Redis is down, either fail login with 503 or use a process-local cap. Add a per-IP ceiling. Keep the existing per-account counter.
4. **K-05 MEDIUM.** Left open. See D-07. Row-level security is a session variable and a policy per table. Application predicates stay.
5. Dashboard test: a user without `company.read` receives `"companies": null` and still receives counts they may see.

## Later

10. **K-12.** A delete of sessions whose `expires_at` or `revoked_at` is older than a retention window.
11. **K-13.** Playwright (or the existing browser runner in CI) for sign-in, one company create, and sign-out.
12. **K-11.** Either read the session cache as a hint that still confirms `revoked_at` in PostgreSQL, or stop writing it. Do not authorize from Redis alone.
13. **K-10.** Leave it unless the owner wants code reuse. If they do, use a partial unique index `WHERE deleted_at IS NULL` and accept that history can show two rows with the same code.
14. **K-14.** Run `docker compose -f infrastructure/docker-compose.yml up -d` on a machine with Docker and repeat migrate, seed, and `pnpm test`.
15. Shared response types when a second client appears. Not before.

## Explicitly deferred

SSO, MFA, email reset, translation, tenant provisioning, and every business module. Those wait on owner decisions recorded as still open in the decision log.
