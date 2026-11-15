# Smart College ERP

Django college ERP and learning system for an MCA final-year demo. Roles are Admin, Teacher, and Student. The database is MySQL.

## Run it in VS Code

1. Install Python 3.11+ and [XAMPP](https://www.apachefriends.org/). Start MySQL from the XAMPP control panel.
2. Open this folder in VS Code and create a virtual environment:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
```

3. Copy the environment file and edit it if your MySQL user is not `root` with an empty password:

```bash
cp .env.example .env
```

4. In phpMyAdmin, or the MySQL shell, create the database:

```sql
CREATE DATABASE smart_college CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. Apply migrations and load the demo college:

```bash
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Open http://127.0.0.1:8000/ and sign in.

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `Admin@12345` |
| Teacher | `anita.sharma` | `Teacher@12345` |
| Teacher | `vikram.rao` | `Teacher@12345` |
| Student | `rahul.verma` | `Student@12345` |
| Student | `neha.kulkarni` | `Student@12345` |

The other seeded students (`arjun.patel`, `meera.nair`, `dev.joshi`, `sara.khan`) use `Student@12345`. Excel import of new students uses the same default password.

Password reset emails print in the terminal that is running `runserver`.

## What you can walk through

- Admin dashboard, college profile, departments, courses, classes, students (including Excel import), teachers and workload, fees, library, timetable, placements, announcements, and PDF/Excel reports.
- Teacher dashboard, syllabus, materials, attendance, assignments, MCQ exams, programming tests, the AI quiz generator, and the question bank.
- Student dashboard, materials, assignment submission, a timed MCQ exam, an AI quiz, a Python programming test, attendance, fees, and results.

## AI quiz generator

Set these in `.env`. Leave `AI_API_KEY` empty to stay in demo mode.

```
AI_PROVIDER=demo
AI_API_KEY=
AI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

`AI_PROVIDER` may be `demo`, `openai`, `custom` (any OpenAI-compatible chat endpoint, including Groq or Together), or `gemini`. The key is read only on the server. It is never written into templates or git.

Without a key, the generator is labeled **demo**:

- Source mode (PDF, DOCX, existing material, or pasted text) builds questions only from sentences in that source. If the source is too short, nothing is saved.
- Manual topic mode returns questions marked `[SAMPLE]` or `[नमूना]`. Those are screen samples, not syllabus facts.

A live provider must return JSON. Source mode is rejected unless every option is copied from the source. A failed or invalid response is not saved.

## Programming tests

Python submissions run in a separate process (`python -I`) with a 3 second timeout, a CPU limit, a memory limit, and a tiny environment. They are not executed inside the Django request with `exec`. Network isolation uses `unshare --net` when the machine allows it. Java and C++ submissions are stored and are not executed. Treat this runner as a demo sandbox, not a hardened judge.

## Reports and language

Reports export to Excel and PDF. PDF text uses a standard Latin font, so Hindi renders in the browser and not in the PDF file.

## Tests

```bash
python manage.py test core
```

The test database is MySQL. The database user needs permission to create and drop a test database.
