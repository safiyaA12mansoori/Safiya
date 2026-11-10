# Master requirements

Requirements below are what Phase 1 implements. Later modules are named only so the catalogue stays stable. They are not specified here.

## Identity and access

- Sign-in uses a tenant slug, email, and password. There is no public registration.
- Passwords are stored only as Argon2id hashes.
- A session lasts 12 hours by default, can be revoked, and is rejected when the user or tenant is inactive.
- The first administrator is created only by the documented seed. The seed does not reset an existing password.
- A user cannot disable their own account. A tenant must keep one active Administrator. A user cannot grant a role or permission they do not hold. System roles cannot be edited.

## Organization

- Tenant, company, and branch are different records.
- A company belongs to one tenant. A branch belongs to one company and stores that company's tenant.
- Retiring a company is refused while it still has branches that have not been retired.
- Codes are unique among both active and retired rows in their scope.

## Master data

- A unit of measure has a code and a name, scoped to the tenant.
- A master record has a tenant-defined type, a code, and a name. The platform does not ship a type catalogue.

## Audit and dashboard

- Sign-in success and failure, sign-out, password changes, and creates, updates, and retires of organization and master data write an audit event.
- Audit events are not updated or deleted by the API.
- The dashboard shows counts from PostgreSQL. A count the caller cannot read is omitted. There are no decorative charts.

## API

- REST under `/api/v1`, described by OpenAPI at `/api/docs`.
- Protected routes require a session. Permission-bearing routes require the named permission.
- A resource in another tenant is not found (404), not described.
- Validation errors name the fields. Conflicts name the duplicate. Unexpected failures return a generic message and are logged on the server.

## Clients

- The web console is the only client in this milestone. It calls the API from the server with the session token. The browser cookie is HTTP-only.
