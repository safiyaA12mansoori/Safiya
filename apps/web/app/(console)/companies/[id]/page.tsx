import { ActionForm } from "../../../../components/forms";
import { ConfirmRetire, Field, PageHeader, Panel, SelectField } from "../../../../components/ui";
import { retireCompanyAction, updateCompanyAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { Company } from "../../../../lib/types";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const company = await api<Company>(`/api/v1/companies/${id}`, token);
  return (
    <>
      <PageHeader title={company.name} description={`Company ${company.code}. Branches are managed separately.`} />
      {me.permissions.includes("company.update") ? (
        <>
          <Panel title="Details">
            <ActionForm action={updateCompanyAction} submitLabel="Save company">
              <input type="hidden" name="id" value={company.id} />
              <Field label="Name" name="name" required defaultValue={company.name} />
              <Field label="Legal name" name="legalName" defaultValue={company.legalName ?? ""} />
              <SelectField label="Status" name="status" defaultValue={company.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
            </ActionForm>
          </Panel>
          <Panel title="Retire">
            <ActionForm action={retireCompanyAction} submitLabel="Retire company">
              <ConfirmRetire id={company.id} />
            </ActionForm>
          </Panel>
        </>
      ) : (
        <p className="text-sm">Status: {company.status === "ACTIVE" ? "Active" : "Inactive"}</p>
      )}
    </>
  );
}
