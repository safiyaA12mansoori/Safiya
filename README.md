# Safiya Dental Clinic — Frontend ERP

Frontend-only clinic management UI for **patients**, **dentists**, **medicines**, **prescriptions**, **appointments**, **treatments**, and **billing**.

Data is stored in the browser (`localStorage`). **No backend is required** to use the app.

## Run the frontend

```bash
npm install
npm run frontend
```

Open the URL Vite prints (usually **http://localhost:5173**).

## What’s included

- Patients with email / date-of-birth validation
- Medicines with min/max dose, max daily dose, stock, max dispense
- Prescriptions with dosage & quantity boundary checks (course coverage for tablets/capsules)
- Appointment conflict detection (same dentist, overlapping times)
- Billing: draft → issue → pay / void

## Optional API (legacy)

An Express API still lives under `src/` if you want server-backed mode:

```bash
npm run dev:api   # http://localhost:3000 (+ older public/ UI)
npm test          # domain/API Vitest suite
```

Primary product path is the Vite frontend in `frontend/`.
