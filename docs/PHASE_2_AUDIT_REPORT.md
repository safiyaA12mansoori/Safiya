# Phase 2 audit report

Date: 2026-11-09. The core platform was already in this working tree. This audit did not rewrite it. The only code change made because of a finding is disabling `X-Powered-By` in `configureApp`. NestJS 11 (decision D-01) and `scripts/with-env.mjs` (D-02) were required to make Phase 1 run and to run the tests; they are implementation, not audit rewrites.

## Scope covered

`apps/web`, `apps/api`, `packages/validation`, Prisma schema and the init migration, auth, RBAC, organization, users, master data, audit, OpenAPI, Compose, `.env.example`, Jest, ESLint, the production web build, a live API smoke, and a manual browser walkthrough. No business module exists to audit.

## Functional audit

| Area | Result |
| --- | --- |
| Dashboard | PASSED. Counts come from `GET /api/v1/dashboard`. Screenshot shows numeric cards and a recent-audit table. No charts. |
| Auth | PASSED. Browser and curl. Wrong password text is the API message. Sign-out returns to the sign-in page. |
| Users and roles | PASSED in API tests for permission denial and the administrator-assignment rule. The browser was signed in as the seeded admin and did not create a second user. |
| Backend permission enforcement | PASSED. Jest: reader cannot create a company; a narrower user cannot assign Administrator. Controllers other than health, login, me, logout, password, and dashboard declare permissions. |
| Organizations | PASSED. Company and branch created through the API. Browser created DEMO and showed it Active next to API1. Copy on the page states a company is not a tenant and not a branch. |
| Master data in PostgreSQL | PASSED. Unit and master record creates returned 201 and appeared in audit. |
| Audit records | PASSED. Append-only via the API. Live rows match the creates and the failed login. |
| API docs | PASSED. `/api/docs` 200, document has 26 paths. Unauthenticated: K-09. |
| Errors | PASSED. 401, 409, and the sign-in form error are structured. 500 text is generic in code. A 500 was not forced. |

Navigation in the screenshot: Dashboard, Organization, Companies, Branches, Users, Roles, Master data, Units, Audit. No CRM, sales, or inventory.

## Checks executed

| Command | Result |
| --- | --- |
| `pnpm typecheck` | Passed (validation, web, API) |
| `pnpm lint` | Passed, ESLint 10.14.0, no findings |
| `pnpm test` | Passed, 4 suites, 13 tests, 3.59s, database `milk_epr_test` |
| `pnpm --filter @milk-epr/api build` | Passed |
| `pnpm --filter @milk-epr/web build` | Passed. Static: `/login`, `/_not-found`. Other console routes dynamic |
| Playwright | Not present. Not run |
| Docker Compose | Not run. No Docker in this environment |

Jest tests that passed:

- Permission keys are unique. Reader permissions are read-only. Short passwords and a login without a tenant slug are rejected.
- Unknown password rejected. Valid session accepted. Logout works. Session restored from PostgreSQL after Redis delete. Disabled user blocked. Ten failures then 429.
- `company.read` cannot create. `user.update` without the admin permission set cannot assign Administrator.
- Company persists, audit row written, other tenant gets an empty list and 404, other tenant cannot attach a branch, own branch 201, master record created, audit has no password hash, health 200, OpenAPI lists the core paths.

## Findings

No CRITICAL defect. The platform's Phase 1 paths that were executed work.

HIGH: K-01 superuser database role. K-02 example bootstrap password.

MEDIUM: K-03 rate-limit fail-open. K-04 throttle key is IP+email. K-05 no row-level security. K-06 audit immutability is not a database rule. K-07 last-admin and company-branch checks are outside the write transaction. K-08 branch tenant and company are not a composite foreign key. Dashboard permission masking has no dedicated test (see `API_AUDIT.md`).

LOW: K-09 public OpenAPI. K-10 retired codes stick. K-11 unused session cache. K-12 session rows kept. K-13 no Playwright. K-14 Compose not executed here. K-15 English only. Hand-written web response types. Offset pagination.

PASSED items are listed in the functional table and in `DATABASE_AUDIT.md` and `SECURITY_AUDIT.md`.

## Phase 3 recommendation

Do not start a business module. Phase 3 should be the remediation in `PHASE_2_REMEDIATION_PLAN.md`, limited to the HIGH items and the database constraints (K-06, K-08) before anyone shares the deployment. After that, the owner picks the first business module. Inventory and finance still need their own ledgers before any quantity or amount is posted. Those ledgers are not Phase 3.
