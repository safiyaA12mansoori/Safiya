# Safiya Dental Clinic Management

TypeScript/Express dental clinic system for **patients**, **dentists**, **appointments**, **treatments**, and **billing**.

## Features

- CRUD APIs and a lightweight browser UI for all five domains
- Appointment conflict detection: the same dentist cannot have overlapping appointments (adjacent end/start times are allowed)
- Billing tied to appointments/treatments, with draft → issue → pay / void lifecycle and totals

## Quick start

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The UI is served from `public/`; JSON APIs live under `/api`.

## API overview

| Resource | Endpoints |
| --- | --- |
| Patients | `GET/POST /api/patients`, `GET/PUT/DELETE /api/patients/:id` |
| Dentists | `GET/POST /api/dentists`, `GET/PUT/DELETE /api/dentists/:id` |
| Treatments | `GET/POST /api/treatments`, `GET/PUT/DELETE /api/treatments/:id` |
| Appointments | `GET/POST /api/appointments`, `PUT/DELETE /api/appointments/:id`, `POST /api/appointments/:id/cancel`, `POST /api/appointments/check-conflict` |
| Billing | `GET/POST /api/bills`, `PUT/DELETE /api/bills/:id`, `POST /api/bills/:id/issue`, `POST /api/bills/:id/payments`, `POST /api/bills/:id/void` |

## Project layout

```
src/domain/          # Entities, billing math, interval overlap
src/services/        # Business rules (conflicts, bill lifecycle)
src/repositories/    # In-memory store
src/api/             # Express routes + error handling
public/              # Management UI
tests/               # Vitest coverage for conflicts, billing, API
```

Data is kept in memory for a clean local demo and deterministic tests. Restarting the server reseeds sample records.
