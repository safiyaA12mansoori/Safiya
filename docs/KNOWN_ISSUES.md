# Known issues

Severity matches the Phase 2 audit. None of these were left as a broken Phase 1 path: the checks in `PROJECT_STATUS.md` passed.

Fixed on 2026-11-10, in migration `20261110130000_integrity` and the role script: K-01 (API uses `milk_app`), K-02 (no bootstrap password in `.env.example`), K-06 (audit trigger and revoked privileges), K-07 (checks run inside the write transaction, with a row lock), K-08 (composite foreign key). The local bootstrap account is still a superuser and is only for creating the cluster and running migrations. No production host was provisioned.

| ID | Severity | Issue |
| --- | --- | --- |
| K-03 | MEDIUM | Login throttling is skipped when Redis throws. Sign-in still succeeds. Left as D-07. |
| K-04 | MEDIUM | The failure counter is per IP and email. One address can try many accounts. Left as D-07. |
| K-05 | MEDIUM | Tenant isolation is application `WHERE tenant_id = ...`. There is no row-level security policy. Left as D-07. |
| K-09 | LOW | OpenAPI UI and JSON are unauthenticated. |
| K-10 | LOW | Retired codes cannot be reused. Unique indexes include soft-deleted rows. Intentional. |
| K-11 | LOW | Redis session entries are written and deleted but never used to authorize. PostgreSQL is always read. Revocation still holds if a Redis delete fails. |
| K-12 | LOW | Expired and revoked session rows are not purged. |
| K-13 | LOW | No Playwright suite. A manual browser walkthrough was done once. |
| K-14 | LOW | Docker Compose was not executed in the agent environment. |
| K-15 | LOW | Console copy is English only. |
