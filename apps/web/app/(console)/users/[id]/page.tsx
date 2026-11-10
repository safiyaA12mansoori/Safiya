import { ActionForm } from "../../../../components/forms";
import { Checks, Field, PageHeader, Panel, SelectField } from "../../../../components/ui";
import { changePasswordAction, replaceRolesAction, updateUserAction } from "../../../../lib/actions";
import { api, requireSession } from "../../../../lib/api";
import type { Page, Role, UserRecord } from "../../../../lib/types";

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { token, me } = await requireSession();
  const user = await api<UserRecord>(`/api/v1/users/${id}`, token);
  const roles = me.permissions.includes("role.read")
    ? (await api<Page<Role>>("/api/v1/roles?limit=100&offset=0", token)).items
    : [];
  return (
    <>
      <PageHeader title={user.name} description={user.email} />
      {me.permissions.includes("user.update") ? (
        <>
          <Panel title="Account">
            <ActionForm action={updateUserAction} submitLabel="Save user">
              <input type="hidden" name="id" value={user.id} />
              <Field label="Name" name="name" required defaultValue={user.name} />
              <SelectField label="Status" name="status" defaultValue={user.status}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </SelectField>
              <Field label="New password" name="newPassword" type="password" autoComplete="new-password" hint="Leave blank to keep the current password." />
            </ActionForm>
          </Panel>
          <Panel title="Roles">
            <ActionForm action={replaceRolesAction} submitLabel="Save roles">
              <input type="hidden" name="id" value={user.id} />
              <Checks
                legend="Assigned roles"
                name="roleIds"
                selected={user.roles.map((role) => role.id)}
                options={roles.map((role) => ({ value: role.id, label: role.name, hint: role.description }))}
              />
            </ActionForm>
          </Panel>
        </>
      ) : (
        <p className="text-sm">Roles: {user.roles.map((role) => role.name).join(", ") || "None"}</p>
      )}
      {me.user.id === user.id ? (
        <Panel title="Your password">
          <ActionForm action={changePasswordAction} submitLabel="Change password">
            <Field label="Current password" name="currentPassword" type="password" required autoComplete="current-password" />
            <Field label="New password" name="newPassword" type="password" required autoComplete="new-password" />
          </ActionForm>
        </Panel>
      ) : null}
    </>
  );
}
