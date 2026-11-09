import { ActionForm } from "../../../components/forms";
import { Field, PageHeader, Panel } from "../../../components/ui";
import { updateTenantAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import type { Tenant } from "../../../lib/types";

export default async function OrganizationPage() {
  const { token, me } = await requireSession();
  const tenant = await api<Tenant>("/api/v1/tenant", token);
  return (
    <>
      <PageHeader
        title="Organization"
        description="The tenant is the isolation boundary for this sign-in. Companies and branches are separate records and are managed on their own pages."
      />
      <Panel title={tenant.name}>
        <dl className="mb-6 grid gap-2 text-sm">
          <div>
            <dt className="text-stone-500">Status</dt>
            <dd>{tenant.status === "ACTIVE" ? "Active" : "Inactive"}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Slug</dt>
            <dd>{tenant.slug}</dd>
          </div>
        </dl>
        {me.permissions.includes("tenant.update") ? (
          <ActionForm action={updateTenantAction} submitLabel="Save organization">
            <Field label="Name" name="name" required defaultValue={tenant.name} />
            <Field
              label="Slug"
              name="slug"
              required
              defaultValue={tenant.slug}
              hint="People use this slug when they sign in. Existing sessions stay valid."
            />
          </ActionForm>
        ) : (
          <p className="text-sm text-stone-600">You can view this tenant but cannot change it.</p>
        )}
      </Panel>
    </>
  );
}
