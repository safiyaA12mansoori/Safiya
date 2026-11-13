# MediCore — Enterprise Healthcare & Clinic Management ERP

Production-oriented **Django + DRF + MySQL + React + Bootstrap 5 + Chart.js + Channels/WebSockets** clinic ERP for multi-clinic operations with RBAC, patient management, appointments, real-time token queues, EMR/prescriptions, billing, pharmacy, lab, staff, notifications, and audit logs.

> Prior dental-clinic frontend/API work lived on branch `cursor/dental-clinic-system-8dd9` (localStorage/Express). MediCore replaces that stack with a MySQL-backed modular layout under `medicore/` + `frontend/`.

## Stack

| Layer | Technology |
|-------|------------|
| API | Python 3.12, Django 5, Django REST Framework, SimpleJWT + session auth |
| DB | **MySQL 8** (target). SQLite only as local fallback (`USE_SQLITE=1`) |
| Realtime | Django Channels + Redis (InMemory layer when `USE_REDIS=0`) |
| UI | React 18, Vite, Bootstrap 5, Chart.js |
| Deploy | Docker Compose, `.env`, Daphne ASGI |

## Roles (RBAC + separate dashboards)

Super Admin · Clinic Owner · Receptionist · Doctor · Accountant · Nurse · Patient  

Clinic-wise data isolation via `X-Clinic-Id` + membership checks.

## Quick start (VS Code / local)

### 1) Clone & environment

```bash
cp .env.example .env
# Prefer MySQL via Compose. For laptop-only fallback:
# echo 'USE_SQLITE=1' >> .env
```

### 2) MySQL + Redis (recommended)

```bash
docker compose up -d db redis
# set USE_SQLITE=0 and USE_REDIS=1 in .env
```

If Docker/MySQL is unavailable, set `USE_SQLITE=1` (documented last-resort only — production target remains MySQL).

### 3) Backend

```bash
cd medicore
python3 -m pip install -r requirements.txt
export USE_SQLITE=1   # skip if MySQL is up
python manage.py migrate
python manage.py setup_medicore
python manage.py runserver
# WebSockets: daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — API proxied to :8000.

### Demo accounts (from `setup_medicore`)

| User | Password | Role |
|------|----------|------|
| `superadmin` | `MediCore@Admin1` | Super Admin |
| `demo_owner` | `MediCore@Demo1` | Clinic Owner |
| `demo_reception` | `MediCore@Demo1` | Receptionist |
| `demo_doctor` | `MediCore@Demo1` | Doctor |
| `demo_accountant` | `MediCore@Demo1` | Accountant |
| `demo_nurse` | `MediCore@Demo1` | Nurse |
| `demo_patient` | `MediCore@Demo1` | Patient |

**Change these passwords before any shared/staging deploy.**

## API documentation

With the API running:

- OpenAPI schema: http://127.0.0.1:8000/api/schema/
- Swagger UI: http://127.0.0.1:8000/api/docs/

Auth: `POST /api/auth/login/` → JWT `access`/`refresh`. Send `Authorization: Bearer <access>` and `X-Clinic-Id: <id>`.

## Tests

```bash
cd medicore
USE_SQLITE=1 python manage.py test apps.core.tests -v 2
```

Critical coverage: login, patient duplicate prevention, appointment double-booking, queue call/skip/recall, clinic isolation, dashboard real stats, TV board without PII.

## Docker deploy

```bash
cp .env.example .env
# set strong DJANGO_SECRET_KEY, MYSQL_*, DJANGO_DEBUG=0
docker compose up --build -d
```

Services: `db` (MySQL), `redis`, `api` (Daphne), `frontend` (nginx).

## Backup & restore (MySQL)

```bash
# Backup
docker compose exec db mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" medicore > backup-$(date +%F).sql

# Restore
docker compose exec -T db mysql -u root -p"$MYSQL_ROOT_PASSWORD" medicore < backup-YYYY-MM-DD.sql
```

SQLite fallback backup: copy `medicore/db.sqlite3`.

Media files: back up `medicore/media/`.

## Security notes

- Passwords hashed with Django PBKDF2; no static API tokens in source
- RBAC + clinic isolation on querysets
- CSRF enabled for session auth; JWT for SPA
- Audit middleware logs mutating `/api/` calls
- Secrets via `.env` only — never commit `.env`
- Patient identifiers: store Aadhaar **last 4 only**; TV board omits patient PII

## Project layout

```
medicore/           Django project (apps: accounts, clinics, patients, appointments,
                    queue_mgmt, emr, billing, pharmacy, lab, staff, notifications, audit, core)
frontend/           React SPA
docker-compose.yml
Dockerfile
.env.example
```

## Management commands

```bash
python manage.py setup_medicore
python manage.py setup_medicore --reset-demo
```
