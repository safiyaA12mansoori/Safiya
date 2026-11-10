# Decision log

Entries are the assumptions implemented in this branch. They are not owner-confirmed policy. Change them by a new entry, not by silently editing behavior.

## O-01 Organization model

Shared PostgreSQL schema, row isolation in the application. A tenant is the isolation boundary. A company is a legal entity inside one tenant. A branch is an operating location of exactly one company. They are different tables. Phase 1 seeds one tenant and does not offer a tenant-provisioning screen. The schema allows more than one tenant. Tests create a second tenant and expect a cross-tenant read to 404 and lists to be empty. No financial books. No dairy organization units.

## O-02 Authentication

Email and password. Argon2id as in `SECURITY_ARCHITECTURE.md`. Server session in PostgreSQL, token stored as SHA-256. Redis caches the session key and counts login failures (10 per 15 minutes per IP and email), and fails open if Redis errors. Cookie `milk_epr_session` plus Bearer. No SSO. No public signup. The first admin comes from the seed. The seed refuses `NODE_ENV=production` unless `ALLOW_BOOTSTRAP=true`. Re-running the seed does not change an existing admin password and does not create companies, branches, units, or master records.

## O-03 Local infrastructure

PostgreSQL 16 and Redis 7 via `infrastructure/docker-compose.yml`. No hosted vendor. The API and web run on the host. This agent environment has no Docker daemon, so the same ports and credentials were provided by a local PostgreSQL 16 cluster and Redis 7. That is an environment limitation, not a change to the Compose file.

## O-04 Master data

No industry entities. A master record is `recordType` + `code` + `name`. Units of measure are a separate table. Nothing in that catalogue is seeded.

## O-05 Money

No money fields in this milestone.

## O-06 Clients

No mobile and no offline. Web console only.

## O-07 First business module

Not chosen. Business modules are not started.

## O-08 Operator

The bootstrap admin is a tenant administrator, not a cross-tenant platform operator. There is no cross-tenant admin API.

## O-09 Language

Console copy is English. Dates on screen are en-GB, UTC. Stored text is Unicode. There are no translation tables.

## D-01 NestJS major

NestJS 11.2.9 and `@nestjs/swagger` 11.4.8, not NestJS 12. NestJS 12 is ESM-only, and the Jest 29 runner used for the required API tests cannot load it. Application code stays CommonJS.

## D-02 Environment loading

`dotenv` and `dotenv-cli` both install a `dotenv` command, and pnpm binds one of them. Scripts call `scripts/with-env.mjs`, which reads the repository-root `.env` without overriding variables already set, then runs Prisma, the seed, or Next.

## D-03 Code reuse after retire

Unique constraints include retired rows. A retired code cannot be reused. Partial unique indexes were considered and not added.

## D-04 Application database role

The API connects as `milk_app`, which is not a superuser. Migrations on a local machine still use the bootstrap account in `MIGRATION_DATABASE_URL`, because Prisma has to create tables. That account stays out of `DATABASE_URL`. `milk_app` may delete link rows (`user_roles`, `role_permissions`) because those screens replace the set. It may not update or delete `audit_events`. No production database has been provisioned. The local password is only for a private development cluster.

## D-05 Audit immutability

A `BEFORE UPDATE OR DELETE` trigger rejects changes to `audit_events`, including changes by the table owner. The application role also lacks those privileges. The audit table and the insert-only API are unchanged. A superuser can disable the trigger. The API is not given that account.

## D-06 Branch and company

`branches (tenant_id, company_id)` references `companies (tenant_id, id)`. The service still checks that the company is active and in the session tenant. The foreign key is the database backstop.

## D-07 Checks left for later

Row-level security is not enabled. It needs a tenant variable on every transaction and a policy on every table, and the application predicates would stay. That is a separate design, not a grant or a foreign key.

Login throttling still fails open when Redis errors. Closing it would make sign-in depend on Redis, which the current session design avoids: PostgreSQL remains the session authority when Redis is down. A process-local cap or a deliberate 503 is a behavior change and was not added. The counter is still per IP and email.
