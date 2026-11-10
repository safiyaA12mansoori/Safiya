# Module catalogue

This is a capability list. It is not a design of dairy operations, and it does not authorize building the later modules.

| Module | Phase 1 state | Depends on |
| --- | --- | --- |
| Core platform: tenant, company, branch, users, RBAC, sessions | Implemented | PostgreSQL |
| Master data: generic typed records, units of measure | Implemented | Core platform |
| Audit | Implemented | Core platform |
| Web console and dashboard | Implemented | Core API |
| CRM | Not started | Core platform, and an owner decision on parties and activities |
| Sales | Not started | Core platform, master data, and an owner decision on commercial documents |
| Procurement | Not started | Core platform, master data |
| Inventory | Not started | Core platform, master data, and a stock ledger designed before any quantity is posted |
| Production | Not started | Core platform, master data, inventory once that ledger exists |
| Finance | Not started | Core platform, and a balanced ledger designed before any amount is posted |
| HR | Not started | Core platform |
| Distribution | Not started | Core platform, inventory once that ledger exists |
| Quality | Not started | Core platform |
| Reporting | Not started | The modules that own the facts being reported |
| AI | Not started | An owner decision on which records it may read |

No module above may bypass the API. None of them may treat a tenant, a company, and a branch as the same record.

The first business module is not chosen. Inventory quantities and finance amounts stay out of the schema until their ledgers are designed. That sequencing is a dependency, not permission to start either module.
