# Security architecture

## Authentication

- No self-service signup.
- Password hashing is Argon2id with memory cost 19456 KiB, time cost 2, and parallelism 1 (`apps/api/src/auth/password.ts`).
- A failed lookup still runs a verify against a dummy hash so the response time does not depend on whether the user exists.
- The error message is always "Invalid tenant, email, or password".
- Session token: 32 random bytes, base64url. Only the SHA-256 hash is stored.
- Cookie `milk_epr_session`: HTTP-only, `SameSite=Lax`, `Secure` when `NODE_ENV=production`, path `/`, max-age from the session TTL (12 hours by default).
- The login JSON also returns the token so the web server action can set its own cookie and so a non-browser client can send `Authorization: Bearer`.
- Logout sets `revoked_at` and deletes the Redis key. Password change and disabling a user revoke that user's other sessions. The caller's own session survives a self-service password change.
- Redis key `milk-epr:login-fail:{ip}:{email}` counts failures. Ten failures in 15 minutes return 429. If Redis errors, the check fails open and sign-in continues. Health then reports Redis down.

## Authorization

- Global `AuthGuard` then `PermissionGuard`.
- Permission keys are the catalogue in `apps/api/src/rbac/catalogue.ts`. Reader holds keys ending in `.read`. Administrator holds all of them.
- Grant rule: the actor must already hold every permission on a role they assign or edit.
- System roles cannot be renamed or re-permissioned.
- Dashboard is available to any signed-in user. Counts the caller cannot read are null, and the console hides those cards.
- Cross-tenant access is a 404 from the handler that scopes the query by `tenantId`. There is no cross-tenant administration API. The bootstrap admin is a tenant administrator.

## Validation and errors

- Bodies and list queries are Zod schemas from `packages/validation`.
- 500 responses say "Internal server error". The exception is logged on the server.
- User and audit payloads do not include `password_hash`.

## What this milestone does not do

No SSO, no MFA, no email reset, no CSRF token beyond `SameSite=Lax`, no Postgres row-level security, no audit immutability enforced by database privileges, no secret manager. OpenAPI is public on the API port.
