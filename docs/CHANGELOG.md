# Changelog

## 0.1.0 — 2026-11-09

Core platform and the Phase 2 audit, in one branch.

### Added

- pnpm workspace with `apps/web` (Next.js, React, Tailwind), `apps/api` (NestJS, Prisma), and `packages/validation`.
- PostgreSQL schema and migration `20261109140000_init`.
- Redis-backed login throttle, session cache, and health.
- Sign-in, sign-out, password change, tenant, company, branch, users, roles, units, generic master records, audit, and dashboard.
- Web console for those APIs.
- OpenAPI at `/api/docs`.
- Jest and Supertest coverage for the permission catalogue, auth, permission checks, and one persistence path with tenant isolation.
- ESLint flat config.
- Architecture documents and the Phase 2 audit documents in `docs/`.

### Changed during the audit

- API responses no longer include `X-Powered-By`. The platform behavior is otherwise unchanged.
- NestJS 11 is used instead of NestJS 12 so the test runner can load the framework. Recorded as D-01.

### Not in this version

Business modules, SSO, mobile, desktop, and a production deployment topology.
