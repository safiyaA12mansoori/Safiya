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
