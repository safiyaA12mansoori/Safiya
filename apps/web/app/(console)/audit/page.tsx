import { Empty, PageHeader, Pager, Table } from "../../../components/ui";
import { api, requireSession } from "../../../lib/api";
import { formatWhen, pageRequest } from "../../../lib/format";
import type { AuditEvent, Page } from "../../../lib/types";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const { token } = await requireSession();
  const paging = pageRequest(params.page);
  const data = await api<Page<AuditEvent>>(
    `/api/v1/audit-events?limit=${paging.limit}&offset=${paging.offset}`,
    token,
  );
  return (
    <>
      <PageHeader
        title="Audit"
        description="Security-sensitive actions and master-data changes recorded for this tenant. Entries are append-only."
      />
      {data.items.length === 0 ? (
        <Empty>No audit events yet.</Empty>
      ) : (
        <Table
          columns={["When (UTC)", "Action", "Record", "Actor"]}
          rows={data.items.map((event) => [
            formatWhen(event.createdAt),
            event.action,
            event.entityId ? `${event.entityType} ${event.entityId.slice(0, 8)}` : event.entityType,
            event.actor ? `${event.actor.name} (${event.actor.email})` : "—",
          ])}
        />
      )}
      <Pager
        page={paging.page}
        total={data.total}
        pageSize={paging.limit}
        hrefFor={(page) => (page > 1 ? `/audit?page=${page}` : "/audit")}
      />
    </>
  );
}
