# Grocery Shop ERP — Phase 1

Phase 1 is the front door of the shop system. Staff can sign in, sign out, change their own password, and — if they are a Super Admin or an Admin — add and manage other staff accounts.

Sales, stock, purchases, customers, suppliers, accounts, and reports are not built yet. Phases 2 and later are not started. Do not create a database, and do not run `Database/schema.sql`, until you approve a connection plan.

## What this release does

- Sign-in and sign-out
- Passwords stored with bcrypt (a one-way hash, not the password itself)
- A signed token (JWT) kept in an httpOnly cookie named `gs_session`
- The same APIs also accept `Authorization: Bearer <token>` for scripts and tests
- Six roles: Super Admin, Admin, Manager, Cashier, Inventory Staff, Accountant
- Super Admin can do everything in Phase 1
- Admin can manage users, except Super Admin accounts
- Every signed-in role can open the dashboard shell and the settings screen
- Other roles cannot open user management
- The dashboard is a layout only. It does not show sales or cash figures
- The settings screen can change the shop name for this browser session only. It does not save GST, address, or billing

Currency is the Indian Rupee (INR). Times use Asia/Kolkata (IST).

## Temporary user store

There is no PostgreSQL connection in Phase 1. Users are stored in a JSON file on this computer:

`Backend/data/users.json`

That file is gitignored. It is a temporary stand-in until a database is approved. The service in `Backend/Services/userStore.js` is the only place that reads and writes it. A later phase can replace that file with PostgreSQL by keeping the same methods: `list`, `findById`, `findByEmail`, `create`, `update`, and `withTransaction`.

`Database/schema.sql` is a draft for that later review. Nothing in the app runs it.

## Session security

The browser signs in with an httpOnly cookie named `gs_session`. JavaScript on the page cannot read it. The cookie is `SameSite=Lax`. It is marked `Secure` only when `NODE_ENV` is `production` (use HTTPS in production, or the browser will not keep the cookie).

APIs also accept `Authorization: Bearer <jwt>`. The browser app does not put the token in `localStorage`.

Logging out clears the cookie and invalidates current tokens for that account. Changing the password does the same, then issues a fresh cookie so the person stays signed in on this browser. A copied token from before the password change or logout will be rejected.

Sign-in allows 8 failures for the same email and address in 15 minutes, then asks the person to wait.

## Requirements

- Node.js 20 or newer (this project was checked on Node.js 22)
- npm

No database is required. The login and app screens use Bootstrap 5 and Bootstrap Icons stored in `Frontend/assets/vendor`, so they do not depend on a CDN.

## Install and run

From the `grocery-shop-erp` folder:

```bash
node -v
npm install
cp .env.example .env
```

Edit `.env`. Replace `JWT_SECRET` with a long random string, and set the first Super Admin name, email, and password. Do not keep the sample values. You can make a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The sample values in `.env.example` are placeholders. The seed script rejects them. Do not commit `.env`.

If those values are not set, the server still starts in sample shop mode. The login page shows **Enter the sample shop**. That account exists only in the local JSON file, and the button disappears once `JWT_SECRET` and the Super Admin values are set. Delete `Backend/data/users.json` before `npm run seed` if a sample shop was already created on this computer.

Create the first Super Admin (writes the gitignored JSON file, not a database):

```bash
npm run seed
```

Start the app:

```bash
npm start
```

The default port is 3000. If you set `PORT` in `.env`, use that port instead.

Open the login page:

http://127.0.0.1:3000/login.html

After sign-in, the app shell is:

http://127.0.0.1:3000/

Sign in with the email and password you put in `.env`. There is no built-in password.

## Roles in Phase 1

| Role | Dashboard | Users | Settings (name in this browser only) | Later modules |
| --- | --- | --- | --- | --- |
| Super Admin | Yes | Yes, including other Super Admins | Yes | Visible, not available |
| Admin | Yes | Yes, except Super Admin accounts | Yes | Visible, not available |
| Manager | Yes | No | Yes | Visible, not available |
| Cashier | Yes | No | Yes | Visible, not available |
| Inventory Staff | Yes | No | Yes | Visible, not available |
| Accountant | Yes | No | Yes | Visible, not available |

Sidebar items for products, inventory, purchases, sales, customers, suppliers, accounts, and reports are disabled on purpose. They do not pretend to save or succeed.

## Tests

Tests use Node's built-in test runner. They do not connect to a database.

```bash
npm test
```

## Project layout

```text
grocery-shop-erp/
├── Backend/
│   ├── Config/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Routes/
│   ├── Services/
│   ├── Utils/
│   ├── data/          temporary gitignored users.json
│   └── Server.js
├── Frontend/
│   ├── index.html
│   ├── login.html
│   ├── pages/
│   ├── css/
│   ├── js/
│   └── assets/
├── Database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql     draft only, not executed
├── Tests/
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

The folders `Database/migrations/` and `Database/seeds/` are empty on purpose. The first account is created with `npm run seed`, not with SQL.

## Left for a later phase

- Approving and connecting PostgreSQL
- Running migrations
- Replacing the JSON user file with the database
- Products, inventory, purchases, sales, customers, suppliers, accounts, and reports
- Live Chart.js charts
- Saving shop, GST, and billing settings

Do not start that work until you approve it.
