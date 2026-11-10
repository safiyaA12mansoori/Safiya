# API audit

Date: 2026-11-09. Process: reading controllers and one live smoke against the seeded tenant, plus the Jest suite. Base URL `http://127.0.0.1:3001`.

## Surface — PASSED

26 paths in `/api/docs-json`. Swagger UI `/api/docs` returned 200. Paths include `/api/v1/auth/login`, `/api/v1/companies`, and `/api/v1/master-records`. The persistence test asserts those three. Global prefix is `api/v1`. OpenAPI itself is mounted at `api/docs`, outside that prefix. A request to `/api/v1/api/docs-json` returned 404, which is expected.

## Smoke, seeded administrator — PASSED

| Call | Result |
| --- | --- |
| Login, wrong password | 401 `INVALID_CREDENTIALS` |
| Login, seed password | 200, keys `token, expiresAt, maxAgeMs, user, permissions` |
| `GET /companies` without a token | 401 |
| `GET /auth/me` | 200 |
| `GET /dashboard` | 200 |
| `GET /health` | 200 |
| `POST /companies` code `API1` | 201 `ACTIVE` |
| `POST /branches` on that company, code `HQ` | 201 |
| `POST /units` code `EA` | 201 |
| `POST /master-records` type `CATEGORY` code `GEN` | 201 |
| `GET /audit-events` | 200, total 6 at that moment, actions included `company.created`, `branch.created`, `unit.created`, `master_record.created`, `auth.login.succeeded`, `auth.login.failed`. No `passwordHash` |
| Second `POST /companies` code `API1` | 409 `CONFLICT` |
| Dashboard after those writes | `companies` 1, `branches` 1, `users` 1, `activeUsers` 1, `units` 1, `masterRecords` 1, `auditEvents` 6 |

The browser session then created company `DEMO`, unit `KG`, and master record `RAW`. The overview screenshot shows companies 2, branches 1, users 1, active users 1, master records 1, units 1, audit events 9, with `company.created` in the recent table. The later audit screenshot lists further `unit.created` and `master_record.created` rows. Those screenshots are the browser evidence. The numeric difference is the extra creates, not a second source of truth.

## Errors — PASSED

The filter emits `statusCode`, `code`, and `message`. Zod issues are passed through when present. Non-HTTP exceptions become 500 with a generic message. The wrong-password body matched that shape.

## Gaps — not failures of the routes that exist

- No idempotency keys.
- Offset pagination only.
- OpenAPI is not generated from a checked-in spec file. It is built at runtime from the Nest decorators and `zod-openapi.ts`. A drift test would compare the document to a fixture. There is no such test. LOW.
- Dashboard is undocumented as a permission exception: any session can call it, and the payload hides forbidden counts. The behavior is tested only by reading `DashboardService`, not by a Jest case that uses a reader missing `company.read`. MEDIUM gap in the test suite, not a broken route. The service returns null for a missing permission.

## Contract location

Request schemas live in `packages/validation` and are the pipes on the controllers. The web's `lib/types.ts` repeats response shapes by hand. A mismatch would be a compile error only on the web's own types, not against the API. LOW. A shared response type package is not justified until a second client exists.
