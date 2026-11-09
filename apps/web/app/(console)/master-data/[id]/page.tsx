import { ActionForm } from "../../../../components/forms";
import { ConfirmRetire, Field, PageHeader, Panel, SelectField, TextArea } from "../../../../components/ui";
import { retireMasterAction, updateMasterAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { MasterRecord } from "../../../../lib/types";

export default async function MasterRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const record = await api<MasterRecord>(`/api/v1/master-records/${id}`, token);
  return (
    <>
      <PageHeader title={record.name} description={`${record.recordType} ${record.code}`} />
      {me.permissions.includes("master.manage") ? (
        <>
          <Panel title="Details">
            <ActionForm action={updateMasterAction} submitLabel="Save record">
              <input type="hidden" name="id" value={record.id} />
              <Field label="Name" name="name" required defaultValue={record.name} />
              <TextArea label="Description" name="description" defaultValue={record.description ?? ""} />
              <SelectField label="Status" name="status" defaultValue={record.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
            </ActionForm>
          </Panel>
          <Panel title="Retire">
            <ActionForm action={retireMasterAction} submitLabel="Retire record">
              <ConfirmRetire id={record.id} />
            </ActionForm>
          </Panel>
        </>
      ) : (
        <p className="text-sm">{record.description || "No description."}</p>
      )}
    </>
  );
}
