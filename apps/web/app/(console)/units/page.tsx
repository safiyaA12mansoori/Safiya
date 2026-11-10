import { ActionForm } from "../../../components/forms";
import { Empty, Field, PageHeader, Panel, Pager, RecordLink, SearchForm, StatusText, Table } from "../../../components/ui";
import { createUnitAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import { pageRequest } from "../../../lib/format";
import type { Page, Unit } from "../../../lib/types";

export default async function UnitsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const { token, me } = await requireSession();
  const paging = pageRequest(params.page);
  const query = new URLSearchParams({ limit: String(paging.limit), offset: String(paging.offset) });
  if (params.q) query.set("q", params.q);
  const data = await api<Page<Unit>>(`/api/v1/units?${query.toString()}`, token);
  const hrefFor = (page: number) => (page > 1 ? `/units?page=${page}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}` : params.q ? `/units?q=${encodeURIComponent(params.q)}` : "/units");
  return (
    <>
      <PageHeader title="Units" description="Units of measure are master data. Nothing is preloaded." />
      <SearchForm action="/units" q={params.q} />
      {data.items.length === 0 ? <Empty>No units yet.</Empty> : (
        <Table
          columns={["Code", "Name", "Status"]}
          rows={data.items.map((unit) => [
            <RecordLink key={unit.id} href={`/units/${unit.id}`}>{unit.code}</RecordLink>,
            unit.name,
            <StatusText key={`${unit.id}-status`} status={unit.status} />,
          ])}
        />
      )}
      <Pager page={paging.page} total={data.total} pageSize={paging.limit} hrefFor={hrefFor} />
      {me.permissions.includes("master.manage") ? (
        <div className="mt-8">
          <Panel title="New unit">
            <ActionForm action={createUnitAction} submitLabel="Create unit">
              <Field label="Code" name="code" required />
              <Field label="Name" name="name" required />
            </ActionForm>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
