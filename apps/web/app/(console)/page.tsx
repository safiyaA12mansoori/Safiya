import Link from "next/link";
import { Empty, PageHeader, Table } from "../../components/ui";
import { api } from "../../lib/api";
import { requireSession } from "../../lib/api";
import { formatWhen } from "../../lib/format";
import type { Dashboard } from "../../lib/types";

const CARDS = [
  { key: "companies", label: "Companies", href: "/companies" },
  { key: "branches", label: "Branches", href: "/branches" },
  { key: "users", label: "Users", href: "/users" },
  { key: "activeUsers", label: "Active users", href: "/users" },
  { key: "masterRecords", label: "Master records", href: "/master-data" },
  { key: "units", label: "Units", href: "/units" },
  { key: "auditEvents", label: "Audit events", href: "/audit" },
] as const;

export default async function DashboardPage() {
  const { token, me } = await requireSession();
  const dashboard = await api<Dashboard>("/api/v1/dashboard", token);
  return (
    <>
      <PageHeader
        title="Overview"
        description={`Counts below are queried from PostgreSQL for ${dashboard.tenant.name}. Sections you cannot read are omitted.`}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CARDS.map((card) => {
          const value = dashboard.counts[card.key];
          if (value === null) return null;
          return (
            <Link key={card.key} href={card.href} className="border border-line bg-panel px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">{card.label}</p>
              <p className="mt-1 font-serif text-3xl">{value}</p>
            </Link>
          );
        })}
      </div>
      <section className="mt-8">
        <h2 className="mb-3 font-serif text-2xl">Recent audit</h2>
        {dashboard.recentAudit === null ? (
          <Empty>Audit events are hidden because {me.user.name} cannot read them.</Empty>
        ) : dashboard.recentAudit.items.length === 0 ? (
          <Empty>No audit events have been recorded for this tenant.</Empty>
        ) : (
          <Table
            columns={["When (UTC)", "Action", "Record", "Actor"]}
            rows={dashboard.recentAudit.items.map((event) => [
              formatWhen(event.createdAt),
              event.action,
              `${event.entityType}${event.entityId ? ` ${event.entityId.slice(0, 8)}` : ""}`,
              event.actor ? event.actor.name : "—",
            ])}
          />
        )}
      </section>
    </>
  );
}
