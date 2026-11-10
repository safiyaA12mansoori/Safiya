import { ActionForm } from "../../../components/forms";
import { Checks, Empty, Field, PageHeader, Panel, Pager, RecordLink, SearchForm, StatusText, Table } from "../../../components/ui";
import { createUserAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import { pageRequest } from "../../../lib/format";
import type { Page, Role, UserRecord } from "../../../lib/types";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const { token, me } = await requireSession();
  const paging = pageRequest(params.page);
  const query = new URLSearchParams({ limit: String(paging.limit), offset: String(paging.offset) });
  if (params.q) query.set("q", params.q);
  const data = await api<Page<UserRecord>>(`/api/v1/users?${query.toString()}`, token);
  const roles = me.permissions.includes("role.read")
    ? (await api<Page<Role>>("/api/v1/roles?limit=100&offset=0", token)).items
    : [];
  const hrefFor = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (page > 1) next.set("page", String(page));
    const text = next.toString();
    return text ? `/users?${text}` : "/users";
  };
  return (
    <>
      <PageHeader title="Users" description="Users sign in to this tenant. A user is not the same thing as a company or a branch." />
      <SearchForm action="/users" q={params.q} />
      {data.items.length === 0 ? (
        <Empty>No users yet.</Empty>
      ) : (
        <Table
          columns={["Name", "Email", "Roles", "Status"]}
          rows={data.items.map((user) => [
            <RecordLink key={user.id} href={`/users/${user.id}`}>{user.name}</RecordLink>,
            user.email,
            user.roles.map((role) => role.name).join(", ") || "—",
            <StatusText key={`${user.id}-status`} status={user.status} />,
          ])}
        />
      )}
      <Pager page={paging.page} total={data.total} pageSize={paging.limit} hrefFor={hrefFor} />
      {me.permissions.includes("user.create") ? (
        <div className="mt-8">
          <Panel title="New user">
            <ActionForm action={createUserAction} submitLabel="Create user">
              <Field label="Name" name="name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="At least 12 characters." />
              <Checks
                legend="Roles"
                name="roleIds"
                options={roles.map((role) => ({ value: role.id, label: role.name }))}
              />
            </ActionForm>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
