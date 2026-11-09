import { ActionForm } from "../../../components/forms";
import {
  Empty,
  Field,
  PageHeader,
  Panel,
  Pager,
  RecordLink,
  SearchForm,
  SelectField,
  StatusText,
  Table,
} from "../../../components/ui";
import { createBranchAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import { pageRequest } from "../../../lib/format";
import type { Branch, Company, Page } from "../../../lib/types";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; companyId?: string }>;
}) {
  const params = await searchParams;
  const { token, me } = await requireSession();
  const paging = pageRequest(params.page);
  const query = new URLSearchParams({ limit: String(paging.limit), offset: String(paging.offset) });
  if (params.q) query.set("q", params.q);
  if (params.companyId) query.set("companyId", params.companyId);
  const data = await api<Page<Branch>>(`/api/v1/branches?${query.toString()}`, token);
  const companies = me.permissions.includes("company.read")
    ? (await api<Page<Company>>("/api/v1/companies?limit=100&offset=0", token)).items.filter((company) => company.status === "ACTIVE")
    : [];
  const hrefFor = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.companyId) next.set("companyId", params.companyId);
    if (page > 1) next.set("page", String(page));
    const text = next.toString();
    return text ? `/branches?${text}` : "/branches";
  };
  return (
    <>
      <PageHeader
        title="Branches"
        description="A branch is an operating location inside one company. It is not a company and it is not a tenant."
      />
      <SearchForm action="/branches" q={params.q}>
        {companies.length > 0 ? (
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Company</span>
            <select name="companyId" defaultValue={params.companyId ?? ""} className="border border-line bg-white px-3 py-2 text-sm">
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.code} — {company.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </SearchForm>
      {data.items.length === 0 ? (
        <Empty>No branches yet.</Empty>
      ) : (
        <Table
          columns={["Code", "Name", "Company", "Status"]}
          rows={data.items.map((branch) => [
            <RecordLink key={branch.id} href={`/branches/${branch.id}`}>{branch.code}</RecordLink>,
            branch.name,
            `${branch.company.code} — ${branch.company.name}`,
            <StatusText key={`${branch.id}-status`} status={branch.status} />,
          ])}
        />
      )}
      <Pager page={paging.page} total={data.total} pageSize={paging.limit} hrefFor={hrefFor} />
      {me.permissions.includes("branch.create") ? (
        <div className="mt-8">
          <Panel title="New branch">
            {companies.length === 0 ? (
              <Empty>Create an active company before adding a branch.</Empty>
            ) : (
              <ActionForm action={createBranchAction} submitLabel="Create branch">
                <SelectField label="Company" name="companyId" defaultValue={companies[0]?.id}>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.code} — {company.name}
                    </option>
                  ))}
                </SelectField>
                <Field label="Code" name="code" required hint="Unique within the company." />
                <Field label="Name" name="name" required />
              </ActionForm>
            )}
          </Panel>
        </div>
      ) : null}
    </>
  );
}
