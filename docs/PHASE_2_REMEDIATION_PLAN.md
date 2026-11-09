# Phase 2 remediation plan

Ordered by what would matter if this left a single private machine. None of these items require replacing the working controllers.

## Before any shared deployment

1. **K-01 HIGH.** Stop using a superuser for the application. Add a migration role and an application role. Grants: `SELECT/INSERT/UPDATE` on the business tables, `INSERT` only on `audit_events`, no `UPDATE` or `DELETE` on `audit_events`. Keep the superuser out of `DATABASE_URL`.
2. **K-02 HIGH.** Treat `.env.example` as a template with a placeholder, not a password that is also the seed default in a shared environment. The production refusal stays. Document that the first password is supplied at seed time and rotated immediately. Do not print it.
3. **K-06 MEDIUM.** Same grant as K-01, or a trigger that rejects `UPDATE` and `DELETE` on `audit_events`. Prefer the grant so a trigger is not the only control.
4. **K-08 MEDIUM.** Composite foreign key `(tenant_id, id)` on companies, referenced by branches `(tenant_id, company_id)`. Requires a unique `(tenant_id, id)` on companies. Application code can stay.
5. **K-09 LOW, promoted for a shared host.** Serve OpenAPI only to authenticated administrators, or do not expose it.

## Next, still before a business module

6. **K-03, K-04 MEDIUM.** When Redis is down, either fail login with 503 or use a process-local cap. Add a per-IP ceiling so one client cannot walk the user list. Keep the existing per-account counter.
7. **K-07 MEDIUM.** Move the last-administrator check and the branch-count check inside the write transaction at `SERIALIZABLE`, or take a row lock on the tenant or company first.
8. **K-05 MEDIUM.** Add row-level security using a session variable set per transaction to `tenant_id`, as a backstop. Do not remove the application predicates. This is the larger change and should land with tests that connect as the application role and try a cross-tenant select.
9. Dashboard test: a user without `company.read` receives `"companies": null` and still receives counts they may see.

## Later

10. **K-12.** A delete of sessions whose `expires_at` or `revoked_at` is older than a retention window.
11. **K-13.** Playwright (or the existing browser runner in CI) for sign-in, one company create, and sign-out.
12. **K-11.** Either read the session cache as a hint that still confirms `revoked_at` in PostgreSQL, or stop writing it. Do not authorize from Redis alone.
13. **K-10.** Leave it unless the owner wants code reuse. If they do, use a partial unique index `WHERE deleted_at IS NULL` and accept that history can show two rows with the same code.
14. **K-14.** Run `docker compose -f infrastructure/docker-compose.yml up -d` on a machine with Docker and repeat migrate, seed, and `pnpm test`.
15. Shared response types when a second client appears. Not before.

## Explicitly deferred

SSO, MFA, email reset, translation, tenant provisioning, and every business module. Those wait on owner decisions recorded as still open in the decision log.
