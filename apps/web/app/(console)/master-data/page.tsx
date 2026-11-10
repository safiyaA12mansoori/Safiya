import { ActionForm } from "../../../components/forms";
import { Empty, Field, PageHeader, Panel, Pager, RecordLink, SearchForm, StatusText, Table, TextArea } from "../../../components/ui";
import { createMasterAction } from "../../../lib/actions";
import { api, requireSession } from "../../../lib/api";
import { pageRequest } from "../../../lib/format";
import type { MasterRecord, Page } from "../../../lib/types";

export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; recordType?: string }>;
}) {
  const params = await searchParams;
  const { token, me } = await requireSession();
  const paging = pageRequest(params.page);
  const query = new URLSearchParams({ limit: String(paging.limit), offset: String(paging.offset) });
  if (params.q) query.set("q", params.q);
  if (params.recordType) query.set("recordType", params.recordType);
  const data = await api<Page<MasterRecord>>(`/api/v1/master-records?${query.toString()}`, token);
  const hrefFor = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.recordType) next.set("recordType", params.recordType);
    if (page > 1) next.set("page", String(page));
    const text = next.toString();
    return text ? `/master-data?${text}` : "/master-data";
  };
  return (
    <>
      <PageHeader
        title="Master data"
        description="Records have a type you define, plus a code and a name. There is no seeded product catalogue."
      />
      <SearchForm action="/master-data" q={params.q}>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Type</span>
          <input name="recordType" defaultValue={params.recordType} className="border border-line bg-white px-3 py-2 text-sm" />
        </label>
      </SearchForm>
      {data.items.length === 0 ? <Empty>No master records yet.</Empty> : (
        <Table
          columns={["Type", "Code", "Name", "Status"]}
          rows={data.items.map((record) => [
            record.recordType,
            <RecordLink key={record.id} href={`/master-data/${record.id}`}>{record.code}</RecordLink>,
            record.name,
            <StatusText key={`${record.id}-status`} status={record.status} />,
          ])}
        />
      )}
      <Pager page={paging.page} total={data.total} pageSize={paging.limit} hrefFor={hrefFor} />
      {me.permissions.includes("master.manage") ? (
        <div className="mt-8">
          <Panel title="New master record">
            <ActionForm action={createMasterAction} submitLabel="Create record">
              <Field label="Type" name="recordType" required hint="A short code you choose, such as CATEGORY." />
              <Field label="Code" name="code" required />
              <Field label="Name" name="name" required />
              <TextArea label="Description" name="description" />
            </ActionForm>
          </Panel>
        </div>
      ) : null}
    </>
  );
}
