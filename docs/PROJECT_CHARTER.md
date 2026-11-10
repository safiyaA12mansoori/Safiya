# Project charter

Milk EPR is a greenfield enterprise platform. This repository started as an empty checkout whose only content was a title in `README.md`. The application lives at the repository root.

## Purpose

Provide one modular system of record for an organization: identity, organization structure, master data, and, later, the business modules the owner chooses. Phase 1 delivers only the core platform those modules will sit on.

## In scope for the core platform

- One tenant as the isolation boundary, with companies and branches as different records inside it.
- Users, roles, and permission checks enforced by the API.
- Generic master data and units of measure. No product catalogue and no dairy-specific workflow.
- An append-only audit of security-sensitive and master-data changes.
- A web console that reads and writes through that API.
- Local PostgreSQL and Redis, migrations, a documented bootstrap admin, and automated tests.

## Out of scope

CRM, sales, procurement, inventory, production, finance, HR, distribution, quality, reporting, AI, mobile, and desktop. No invented operating procedures for those areas. No money fields in this milestone.

## Authority

The API is the only business-logic authority. The web console does not decide permissions or tenant scope. PostgreSQL is the system of record. Redis supports login throttling, a session cache, and the health check.

## Success for this milestone

A developer can start PostgreSQL and Redis, migrate, seed, and run the web and API. An administrator can sign in, manage the tenant's companies, branches, users, roles, units, and master records, and see those changes on the dashboard and in the audit log. Another tenant cannot read those rows.
