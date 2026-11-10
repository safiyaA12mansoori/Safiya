# Security audit

Date: 2026-11-09. No destructive tests. No attempts to exhaust a real account beyond the existing Jest rate-limit test, which uses the test database and then truncates it. The live smoke sent one wrong password and one correct password.

## Login and logout — PASSED

`POST /api/v1/auth/login` with a wrong password returned 401 `INVALID_CREDENTIALS` and the message "Invalid tenant, email, or password". The browser showed that same sentence, not a stack trace. A correct login returned 200 with `token`, `expiresAt`, `maxAgeMs`, `user`, and `permissions`. The body did not contain `passwordHash`.

The response set `Set-Cookie: milk_epr_session=...; Max-Age=43200; Path=/; HttpOnly; SameSite=Lax`. `Secure` was absent because `NODE_ENV` was not `production`. That matches the code.

Logout is `POST /api/v1/auth/logout`, which sets `revoked_at`, deletes the Redis key, writes `auth.logout`, and clears the cookie. The browser Sign out returned to the sign-in page. Jest covers logout, a Redis delete followed by a PostgreSQL reload, and a disabled user whose existing session stops working.

## Passwords — PASSED for storage, HIGH if the example password is reused (K-02)

Argon2id parameters are memory 19456 KiB, time 2, parallelism 1. New passwords must be at least 12 characters in `packages/validation`. The seed hashes the bootstrap password and will not replace it on a later run. `NODE_ENV=production` refuses the seed unless `ALLOW_BOOTSTRAP=true`.

`.env.example` still publishes `local-dev-password`. That is the local development credential and it is documented as such. It is a known secret if anyone uses it outside a private machine.

There is no email reset. An administrator sets `newPassword` on `PATCH /users/{id}`. That revokes the target's sessions. LOW absence, by design of this milestone, not a broken control.

## Session expiry — PASSED

`expires_at` is now plus `SESSION_TTL_HOURS` (12). `resolve` rejects a missing row, a revoked row, an expired row, an inactive user, and an inactive tenant. Jest covers disable-and-revoke. Expired rows are not deleted (K-12, LOW).

## Protected endpoints — PASSED

`GET /companies` without a token returned 401. Health and login are the public routes. `GET /auth/me`, logout, password change, and dashboard require a session and no extra permission. Every other route in the controllers carries `@RequirePermissions`. A route with an empty permission list would be session-only; the dashboard is the intentional case, and it nulls counts the caller cannot read.

## RBAC — PASSED

The catalogue has unique keys (unit test). Reader keys are only `*.read` (unit test). A principal with `company.read` can list and cannot create (API test). A principal with `user.update` but not the full set cannot assign Administrator (API test). System roles are rejected for edit in `RbacService`. The actor must hold each permission they grant.

## Cross-organization access — PASSED in the tested paths

The persistence test uses a second tenant. That tenant's list does not include the company, `GET` by id is 404, and creating a branch with the other tenant's company id is rejected. Audit for the other tenant does not contain the first tenant's `company.created`. There is no API that takes a tenant id from the client. The session's tenant is the scope.

This is application-level (K-05, MEDIUM). It is not a database policy.

## Validation — PASSED

Zod parses bodies. The unit test rejects a short password and a login without a tenant slug. The duplicate company smoke returned 409 with a fixed message. 500 responses replace the message with "Internal server error" and log the exception.

## Sensitive exposure — MIXED

| Item | Class |
| --- | --- |
| Password hash absent from login, user DTO, and the live audit page | PASSED |
| Cookie HTTP-only and SameSite=Lax | PASSED |
| Login JSON includes the raw session token | LOW. Required for Bearer and for the web server action. An XSS on the API origin could read it. The console does not render API HTML. |
| OpenAPI and Swagger UI unauthenticated (`/api/docs` 200, `/api/docs-json` 200, 26 paths) | LOW (K-09) on a localhost bind. Must be closed on a shared host. |
| `X-Powered-By: Express` was present on the smoke response | Fixed in this audit by `disable("x-powered-by")` before the final API build. Not re-requested after the rebuild. |
| CORS allows only `WEB_ORIGIN` and credentials | PASSED |
| Rate limit fails open, and is per IP+email | MEDIUM (K-03, K-04) |
| No CSRF token | LOW. Cookie POSTs are SameSite=Lax. The console sends Bearer from the Next.js server, not from browser JavaScript. |

## Not tested, on purpose

No password spraying, no fuzzing, no attempt to crash Redis during a live login, no privilege change against the superuser role. Those would be destructive or noisy relative to this audit. The fail-open path is visible in `RedisService.getLoginFailures`, which returns null on error, and in `AuthService.login`, which only blocks when the count is a number at or above the limit.
