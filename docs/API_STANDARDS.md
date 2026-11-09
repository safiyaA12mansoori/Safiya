# API standards

Base path `/api/v1`. JSON. OpenAPI UI at `/api/docs`. OpenAPI document at `/api/docs-json` (not under the global prefix).

## Auth

- `Authorization: Bearer <token>` or cookie `milk_epr_session`.
- 401 `UNAUTHENTICATED` when the session is missing, expired, revoked, or the user or tenant is inactive.
- 403 `FORBIDDEN` when the session is valid and a required permission is missing.

## Resources

| Area | Methods |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password` |
| Tenant | `GET /tenant`, `PATCH /tenant` |
| Companies | list, create, get, update, `POST /companies/{id}/retire` |
| Branches | list, create, get, update, retire. Create body includes `companyId`. |
| Users | list, create, get, update, `PUT /users/{id}/roles` |
| Roles | `GET /permissions`, list, get, create, update |
| Units and master records | list, create, get, update, retire |
| Audit | `GET /audit-events` |
| Dashboard | `GET /dashboard` |
| Health | `GET /health` public. 200 when PostgreSQL and Redis both answer, 503 otherwise. |

Creates return 201. Login, logout, password change, and retire return 200.

## Lists

`limit` 1–100, default 50. `offset` default 0. Optional `q`. Branches accept optional `companyId`. Master records accept optional `recordType`. Response shape: `{ items, total, limit, offset }`.

## Errors

```json
{ "statusCode": 400, "code": "BAD_REQUEST", "message": "...", "issues": [] }
```

`issues` is present for Zod failures. 409 uses code `CONFLICT`. 429 uses `RATE_LIMITED`. Unknown ids and other tenants use 404 `NOT_FOUND`.

## Change rule

A new field is added in `packages/validation` and the service together. The web does not invent a field the API does not accept. Business modules, when they exist, add their own controllers under the same prefix and the same guards. They do not get a second auth stack.
