# Safiya — Smart School ERP

Safiya is a Django school system for one school. This release covers accounts, students, teachers, classes, subjects, and teacher allocation. Later modules are installed as empty apps and have no pages yet.

There are three roles: Principal/Admin, Teacher, and Student. Parent contact is stored on the student record. There is no parent login.

## Requirements

- Python 3.12
- MySQL 8
- The packages in `requirements.txt`

The database is MySQL. Credentials come from environment variables. The app does not ship with a SQLite configuration.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set `DJANGO_SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`. Do not commit `.env`.

Create the database and a user that can create the test database:

```sql
CREATE DATABASE smart_school_erp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp_user'@'127.0.0.1' IDENTIFIED BY 'choose-a-password';
GRANT ALL PRIVILEGES ON smart_school_erp.* TO 'erp_user'@'127.0.0.1';
GRANT ALL PRIVILEGES ON test_smart_school_erp.* TO 'erp_user'@'127.0.0.1';
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES ON *.* TO 'erp_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Put that same password in `DB_PASSWORD`.

```bash
python manage.py migrate
python manage.py create_dev_users
python manage.py runserver
```

`create_dev_users` creates one user for each role, a current academic year (2026-2027 if none is current), Primary 1 division A, Mathematics, and sample links between them. It prints random passwords once. It runs only when `DJANGO_DEBUG=true`. Run it again with `--reset` to rotate those passwords. The command does not write passwords into the repository.

## Sign in

Open http://127.0.0.1:8000/login/

| Role | Dev username | Dashboard |
| --- | --- | --- |
| Principal/Admin | `principal` | http://127.0.0.1:8000/principal/ |
| Teacher | `teacher` | http://127.0.0.1:8000/teacher/ |
| Student | `student` | http://127.0.0.1:8000/student/ |

Passwords are whatever the command printed. Account settings for every role are at http://127.0.0.1:8000/account/.

Students and teachers created from the principal screens use their generated ID as the username (`STD…` or `TCH…`). The development users above keep the short usernames so they are easy to find; their official IDs are still printed by the command.

## Identifiers

- Student ID: `STD` + calendar year + sequence of at least four digits, for example `STD20260001`
- Admission number: `ADM` + calendar year + sequence, for example `ADM20260001`
- Teacher ID: `TCH` + calendar year + sequence, for example `TCH20260001`

The temporary password is hashed and shown to the principal once.

## Tests

```bash
python manage.py test
```

Tests use a separate MySQL database named by `DB_TEST_NAME` (default `test_smart_school_erp`).

## What this release does

- Login, logout, password change, and login rate limiting
- Role checks so teachers and students cannot manage school records
- Principal create, view, edit, and delete for students and teachers
- Classes (Primary 1–5, Secondary 6–10) and divisions
- Subjects, class subject lists, and teacher allocation
- Academic years, including a single current year
- Audit log entries for those changes
- Search and pagination on the lists

## Not in this release

Timetable, attendance, syllabus, textbooks, lecture progress, quizzes, homework, examinations, performance analytics, notifications, and reports are not built. Chart export, backups, and deployment hardening are later work.
