Safiya Dental Clinic — STQA Project
===================================
Safiya Mansoori · Dental Clinic Management System

STQA REQUIREMENTS
-----------------
Develop: patients, dentists, appointments, treatments, billing
Test: appointment conflicts and billing

Modules in this Bootstrap frontend:
  Patients · Dentists · Appointments · Treatments · Billing
  (+ prescriptions, daily follow-up, no-shows)

Appointment booking collects name, address, phone, reason, dentist,
allotted time; date is set automatically. Conflicts block double-booking
the same dentist (and the same patient) in overlapping slots.

Automated tests (repo root): npm test
  - tests/appointment-conflict.test.ts
  - tests/billing.test.ts
  - tests/api.test.ts

Blue / white theme with animated dental equipment.

USERS
-----
Receptionist: Appointments, follow-up, no-shows, patients, dentists
Owner: Overview, patients, dentists, treatments, prescriptions, billing, no-shows

HOW TO OPEN
-----------
1. Unzip
2. Open index.html
3. Choose Receptionist or Owner
