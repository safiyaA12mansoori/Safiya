import { ActionForm } from "../../../../components/forms";
import { ConfirmRetire, Field, PageHeader, Panel, SelectField } from "../../../../components/ui";
import { retireBranchAction, updateBranchAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { Branch } from "../../../../lib/types";

export default async function BranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const branch = await api<Branch>(`/api/v1/branches/${id}`, token);
  return (
    <>
      <PageHeader
        title={branch.name}
        description={`Branch ${branch.code} of ${branch.company.name}.`}
      />
      {me.permissions.includes("branch.update") ? (
        <>
          <Panel title="Details">
            <ActionForm action={updateBranchAction} submitLabel="Save branch">
              <input type="hidden" name="id" value={branch.id} />
              <Field label="Name" name="name" required defaultValue={branch.name} />
              <SelectField label="Status" name="status" defaultValue={branch.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
            </ActionForm>
          </Panel>
          <Panel title="Retire">
            <ActionForm action={retireBranchAction} submitLabel="Retire branch">
              <ConfirmRetire id={branch.id} />
            </ActionForm>
          </Panel>
        </>
      ) : (
        <p className="text-sm">Status: {branch.status === "ACTIVE" ? "Active" : "Inactive"}</p>
      )}
    </>
  );
}
