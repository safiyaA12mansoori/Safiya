import { ActionForm } from "../../../../components/forms";
import { Checks, Field, PageHeader, Panel, TextArea } from "../../../../components/ui";
import { updateRoleAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { Permission, Role } from "../../../../lib/types";

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const role = await api<Role>(`/api/v1/roles/${id}`, token);
  const permissions = (await api<{ items: Permission[] }>("/api/v1/permissions", token)).items.filter((item) =>
    me.permissions.includes(item.key),
  );
  return (
    <>
      <PageHeader title={role.name} description={role.description || "No description."} />
      {role.isSystem ? (
        <Panel title="System role">
          <p className="mb-3 text-sm">System roles cannot be edited. Their permissions are installed by the seed.</p>
          <ul className="grid gap-1 text-sm">
            {role.permissions.map((permission) => (
              <li key={permission.key}>
                <span className="font-medium">{permission.key}</span> — {permission.description}
              </li>
            ))}
          </ul>
        </Panel>
      ) : me.permissions.includes("role.manage") ? (
        <Panel title="Edit role">
          <ActionForm action={updateRoleAction} submitLabel="Save role">
            <input type="hidden" name="id" value={role.id} />
            <Field label="Name" name="name" required defaultValue={role.name} />
            <TextArea label="Description" name="description" defaultValue={role.description} />
            <Checks
              legend="Permissions"
              name="permissionKeys"
              selected={role.permissions.map((permission) => permission.key)}
              options={permissions.map((item) => ({ value: item.key, label: item.key, hint: item.description }))}
            />
          </ActionForm>
        </Panel>
      ) : (
        <ul className="grid gap-1 text-sm">
          {role.permissions.map((permission) => (
            <li key={permission.key}>{permission.key}</li>
          ))}
        </ul>
      )}
    </>
  );
}
