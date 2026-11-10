-- Local development only. Creates the application role used by DATABASE_URL.
-- The bootstrap user that runs this script is a superuser on a private machine
-- (Compose POSTGRES_USER, or the local cluster role). Do not use that account
-- as DATABASE_URL. This script does not provision a production host.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'milk_app') THEN
    CREATE ROLE milk_app LOGIN PASSWORD 'milk_app_local' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

ALTER ROLE milk_app WITH NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

GRANT CONNECT ON DATABASE milk_epr TO milk_app;
GRANT CONNECT ON DATABASE milk_epr_test TO milk_app;

\connect milk_epr
GRANT USAGE ON SCHEMA public TO milk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO milk_app;

\connect milk_epr_test
GRANT USAGE ON SCHEMA public TO milk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO milk_app;
