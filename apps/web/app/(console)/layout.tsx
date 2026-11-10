import { SideNav } from "../../components/nav";
import { logoutAction } from "../../lib/actions";
import { requireSession } from "../../lib/api";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/organization", label: "Organization", permission: "tenant.read" },
  { href: "/companies", label: "Companies", permission: "company.read" },
  { href: "/branches", label: "Branches", permission: "branch.read" },
  { href: "/users", label: "Users", permission: "user.read" },
  { href: "/roles", label: "Roles", permission: "role.read" },
  { href: "/master-data", label: "Master data", permission: "master.read" },
  { href: "/units", label: "Units", permission: "master.read" },
  { href: "/audit", label: "Audit", permission: "audit.read" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { me } = await requireSession();
  const items = NAV.filter((item) => !item.permission || me.permissions.includes(item.permission));
  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="flex flex-col bg-sidebar px-4 py-6 text-white">
        <p className="font-serif text-2xl">Milk EPR</p>
        <p className="text-xs uppercase tracking-[0.16em] text-white/50">Core platform</p>
        <p className="mt-6 text-sm">{me.tenant.name}</p>
        <p className="text-xs text-white/50">Tenant {me.tenant.slug}</p>
        <div className="mt-6">
          <SideNav items={items} />
        </div>
        <div className="mt-8 border-t border-white/10 pt-4 md:mt-auto">
          <p className="text-sm">{me.user.name}</p>
          <p className="text-xs text-white/50">{me.user.email}</p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="text-sm text-white underline-offset-2 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
