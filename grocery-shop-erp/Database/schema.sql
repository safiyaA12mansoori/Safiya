-- Grocery Shop ERP
-- DRAFT FOR LATER REVIEW ONLY.
-- Do not run this file. Phase 1 does not connect to PostgreSQL.
-- Do not migrate a database until the shop owner approves a connection plan.
-- Phase 1 accounts live in the gitignored JSON file created by npm run seed.

CREATE TABLE roles (
  id smallserial PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE permissions (
  id smallserial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE role_permissions (
  role_id smallint NOT NULL REFERENCES roles (id),
  permission_id smallint NOT NULL REFERENCES permissions (id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  role_id smallint NOT NULL REFERENCES roles (id),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  token_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Suggested role names, matching Phase 1:
-- Super Admin, Admin, Manager, Cashier, Inventory Staff, Accountant
-- Suggested permission codes, matching the running app:
-- dashboard.view, users.manage, settings.view, products.view, products.manage

CREATE TABLE products (
  id uuid PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  pack_size text NOT NULL,
  unit text NOT NULL,
  price_paise integer NOT NULL CHECK (price_paise > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Inserts are intentionally omitted so this file cannot be mistaken for a seed that should be run.
