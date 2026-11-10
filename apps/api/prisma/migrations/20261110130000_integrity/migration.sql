-- Branch tenant and company must name the same company row.
ALTER TABLE "branches" DROP CONSTRAINT "branches_company_id_fkey";

CREATE UNIQUE INDEX "companies_tenant_id_id_key" ON "companies"("tenant_id", "id");

ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_company_id_fkey" FOREIGN KEY ("tenant_id", "company_id") REFERENCES "companies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- audit_events is append-only for every role, including the table owner.
-- A superuser can still disable the trigger. The application role is not a superuser.
CREATE OR REPLACE FUNCTION milk_epr_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION milk_epr_reject_audit_mutation();

-- Application role. Created by infrastructure/postgres/app-role.sql before migrate.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'milk_app') THEN
    RAISE EXCEPTION 'milk_app does not exist. Run infrastructure/postgres/app-role.sql as the local bootstrap user before migrating.';
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO milk_app;
REVOKE UPDATE, DELETE ON TABLE audit_events FROM milk_app;
REVOKE ALL ON TABLE _prisma_migrations FROM milk_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO milk_app;
