import Link from "next/link";
import { ActionForm } from "../../../components/forms";
import { Empty, Field, PageHeader, Panel, Pager, RecordLink, SearchForm, StatusText, Table } from "../../../components/ui";
import { createCompanyAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import { pageRequest } from "../../../lib/format";
import type { Company, Page } from "../../../lib/types";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { token, me } = await requireSession();
  const paging = pageRequest(params.page);
  const query = new URLSearchParams({ limit: String(paging.limit), offset: String(paging.offset) });
  if (params.q) query.set("q", params.q);
  const data = await api<Page<Company>>(`/api/v1/companies?${query.toString()}`, token);
  const hrefFor = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (page > 1) next.set("page", String(page));
    const text = next.toString();
    return text ? `/companies?${text}` : "/companies";
  };
  return (
    <>
      <PageHeader
        title="Companies"
        description="A company is a legal entity inside this tenant. It is not a tenant and it is not a branch."
      />
      <SearchForm action="/companies" q={params.q} />
      {data.items.length === 0 ? (
        <Empty>No companies yet.</Empty>
      ) : (
        <Table
          columns={["Code", "Name", "Legal name", "Status"]}
          rows={data.items.map((company) => [
            <RecordLink key={company.id} href={`/companies/${company.id}`}>{company.code}</RecordLink>,
            company.name,
            company.legalName ?? "—",
            <StatusText key={`${company.id}-status`} status={company.status} />,
          ])}
        />
      )}
      <Pager page={paging.page} total={data.total} pageSize={paging.limit} hrefFor={hrefFor} />
      {me.permissions.includes("company.create") ? (
        <div className="mt-8">
          <Panel title="New company">
            <ActionForm action={createCompanyAction} submitLabel="Create company">
              <Field label="Code" name="code" required hint="Short identifier, unique in this tenant." />
              <Field label="Name" name="name" required />
              <Field label="Legal name" name="legalName" />
            </ActionForm>
          </Panel>
        </div>
      ) : null}
      <p className="mt-4 text-sm">
        <Link href="/branches">Branches belong to a company.</Link>
      </p>
    </>
  );
}
