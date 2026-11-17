# Safiya Tuition ERP — Phase 1 demo

A browser-only tuition institute demo for one sample institute, Safiya Tuition Academy. It covers admissions, teachers, courses, batches, attendance, fees, payments, examinations, results, reports, and role-based portals.

Phase 1 does **not** include Flask, PostgreSQL, or real authentication. Records stay in `localStorage` in this browser. A later phase can replace `assets/js/storage.js` with a server, using the same record shapes. The role checks only hide screens. They are not security.

Chart.js 4.4.6 (MIT) is vendored at `assets/js/chart.umd.min.js`.

## Run it

From this folder:

```bash
python3 -m http.server 8080
```

Open [http://127.0.0.1:8080/login.html](http://127.0.0.1:8080/login.html).

Opening `login.html` directly from the file system also works for the screens. Use the local server if the browser blocks parts of a `file://` page.

The first visit seeds sample data. Later visits keep your edits. To restore the sample institute, clear this site's storage in the browser and reload. There is no reset button in Settings, because Settings only covers the institute profile, academic year, users, appearance, and logout.

## Demo accounts

The login page lists these accounts. "Use" fills the form. Passwords are stored in the browser in plain text so the demo can be tried. Do not reuse them anywhere else.

| Role | Email | Password | What you can open |
| --- | --- | --- | --- |
| Admin | admin@safiya.edu | Admin@123 | Everything, including users and the institute profile |
| Teacher | teacher@safiya.edu | Teacher@123 | Priya Nair's batches, their students, attendance, exams, and marks |
| Accountant | accountant@safiya.edu | Account@123 | Fee structures, invoices, payments, student fee details, fee reports |
| Student | student@safiya.edu | Student@123 | Aarav Mehta's profile, attendance, fees, and results |
| Parent | parent@safiya.edu | Parent@123 | Aarav Mehta and Diya Mehta |

You can also sign in with the usernames `admin`, `priya`, `accounts`, `aarav`, and `rajesh`.

Remember me keeps the session after the browser closes. Without it, the session ends when the tab session ends.

## What works

- Light theme by default, with a dark mode toggle that is remembered
- Dashboards whose counts come from the stored students, attendance, and payments
- Student, teacher, course, and batch create / edit / delete (admin)
- Attendance for a date and batch, including edits, history, and a monthly report
- One attendance row per student, batch, and date
- Fee structures, invoices, discounts, late fees, and statuses Paid, Partial, Pending, and Overdue
- Payments by cash, UPI, bank transfer, or card, with a printable receipt
- Examinations, marks, totals, percentage, grade, pass/fail, and a printable result sheet
- Student and parent portals
- Reports with search, date and batch filters, print, and CSV export
- Confirmation before deletes, and success or error messages
- A direct link to a page your role cannot use shows a not-allowed message

## What is not implemented

- Flask, PostgreSQL, or any API
- Real login, password reset, or email
- More than one institute (records already carry an institute id for a later split)
- Server-side permissions
