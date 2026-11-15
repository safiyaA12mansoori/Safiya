# Safiya — Recruitment Management System

Django app for posting jobs with eligibility criteria, registering applicants, screening against those rules, and scheduling interviews for candidates who pass.

Sibling Safiya projects use Django + Bootstrap; this follows the same stack. SQLite is the default database so tests and local demos run without MySQL. Set `DB_ENGINE=mysql` in `.env` for XAMPP MySQL.

## Features

1. **Job posting** — create/manage openings with education, experience, skills, notice period, work authorization, age, and location/remote criteria.
2. **Applicant registration** — register or update applicants (upsert by email) and apply to open jobs.
3. **Screening** — evaluate applications with a conjunctive eligibility decision table (`recruitment/eligibility.py`).
4. **Interview scheduling** — schedule interviews only for applications that passed screening.
5. **Eligibility tests** — decision-table and equivalence-class suites (not happy-path-only).

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open http://127.0.0.1:8000/

## Tests

```bash
pytest
```

Eligibility coverage lives in:

- `recruitment/tests/test_eligibility_decision_table.py` — full decision-table rows (single-condition failures, multi-fail, boundaries, remote rescue).
- `recruitment/tests/test_eligibility_equivalence.py` — equivalence classes and boundaries per input factor.
- `recruitment/tests/test_pipeline.py` — job → apply → screen → interview integration.

## Eligibility rules (decision table)

An applicant **PASSes** only if all conditions hold:

| ID | Condition |
| --- | --- |
| C1 | Education ≥ job minimum |
| C2 | Experience years ≥ job minimum |
| C3 | All required skills present |
| C4 | Notice period ≤ job maximum |
| C5 | Work authorization when required |
| C6 | Age within `[min_age, max_age]` |
| C7 | Location allowed, or (`remote_ok` and prefers remote) |

Any failed condition yields **FAIL** with reason strings for recruiters.
