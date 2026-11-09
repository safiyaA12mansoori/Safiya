import { ActionForm } from "../../../../components/forms";
import { ConfirmRetire, Field, PageHeader, Panel, SelectField } from "../../../../components/ui";
import { retireUnitAction, updateUnitAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { Unit } from "../../../../lib/types";

export default async function UnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const unit = await api<Unit>(`/api/v1/units/${id}`, token);
  return (
    <>
      <PageHeader title={unit.name} description={`Unit ${unit.code}`} />
      {me.permissions.includes("master.manage") ? (
        <>
          <Panel title="Details">
            <ActionForm action={updateUnitAction} submitLabel="Save unit">
              <input type="hidden" name="id" value={unit.id} />
              <Field label="Name" name="name" required defaultValue={unit.name} />
              <SelectField label="Status" name="status" defaultValue={unit.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
            </ActionForm>
          </Panel>
          <Panel title="Retire">
            <ActionForm action={retireUnitAction} submitLabel="Retire unit">
              <ConfirmRetire id={unit.id} />
            </ActionForm>
          </Panel>
        </>
      ) : (
        <p className="text-sm">{unit.code}</p>
      )}
    </>
  );
}
