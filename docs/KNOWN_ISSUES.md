# Known issues

Severity matches the Phase 2 audit. None of these were left as a broken Phase 1 path: the checks in `PROJECT_STATUS.md` passed.

| ID | Severity | Issue |
| --- | --- | --- |
| K-01 | HIGH | Compose creates PostgreSQL role `milk` as a superuser. Fine on a private laptop. Not fine on a shared server. |
| K-02 | HIGH | `.env.example` contains the bootstrap password `local-dev-password`. The seed will not run when `NODE_ENV=production` unless `ALLOW_BOOTSTRAP=true`. Copying the example into a shared environment and setting that flag would publish a known password. |
| K-03 | MEDIUM | Login throttling is skipped when Redis throws. Sign-in still succeeds. Health returns 503, which does not block the login route. |
| K-04 | MEDIUM | The failure counter is per IP and email. One address can try many accounts. |
| K-05 | MEDIUM | Tenant isolation is application `WHERE tenant_id = ...`. There is no row-level security policy. |
| K-06 | MEDIUM | `audit_events` is append-only because no API updates it. The database role can. |
| K-07 | MEDIUM | The last-administrator check and the company-has-branches check run before the write transaction. Concurrent requests can pass both checks. |
| K-08 | MEDIUM | `branches.tenant_id` and `branches.company_id` are separate foreign keys. The database does not require the company to be in that tenant. The service checks. |
| K-09 | LOW | OpenAPI UI and JSON are unauthenticated. |
| K-10 | LOW | Retired codes cannot be reused. Unique indexes include soft-deleted rows. Intentional. |
| K-11 | LOW | Redis session entries are written and deleted but never used to authorize. PostgreSQL is always read. Revocation still holds if a Redis delete fails. |
| K-12 | LOW | Expired and revoked session rows are not purged. |
| K-13 | LOW | No Playwright suite. A manual browser walkthrough was done once. |
| K-14 | LOW | Docker Compose was not executed in the agent environment. |
| K-15 | LOW | Console copy is English only. |
