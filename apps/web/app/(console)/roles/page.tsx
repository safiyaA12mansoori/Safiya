import { ActionForm } from "../../../components/forms";
import { Checks, Empty, Field, PageHeader, Panel, RecordLink, Table, TextArea } from "../../../components/ui";
import { createRoleAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import type { Page, Permission, Role } from "../../../lib/types";

export default async function RolesPage() {
  const { token, me } = await requireSession();
  const roles = await api<Page<Role>>("/api/v1/roles?limit=100&offset=0", token);
  const permissions = me.permissions.includes("role.read")
    ? (await api<{ items: Permission[] }>("/api/v1/permissions", token)).items.filter((item) => me.permissions.includes(item.key))
    : [];
  return (
    <>
      <PageHeader
        title="Roles"
        description="A role is a named set of permissions. Every protected API route checks the caller's permissions."
      />
      {roles.items.length === 0 ? (
        <Empty>No roles yet.</Empty>
      ) : (
        <Table
          columns={["Name", "Permissions", "Kind"]}
          rows={roles.items.map((role) => [
            <RecordLink key={role.id} href={`/roles/${role.id}`}>{role.name}</RecordLink>,
            String(role.permissions.length),
            role.isSystem ? "System" : "Custom",
          ])}
        />
      )}
      {me.permissions.includes("role.manage") ? (
        <div className="mt-8">
          <Panel title="New role">
            <ActionForm action={createRoleAction} submitLabel="Create role">
              <Field label="Name" name="name" required />
              <TextArea label="Description" name="description" />
              <Checks
                legend="Permissions you can grant"
                name="permissionKeys"
                options={permissions.map((item) => ({ value: item.key, label: item.key, hint: item.description }))}
              />
            </ActionForm>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
