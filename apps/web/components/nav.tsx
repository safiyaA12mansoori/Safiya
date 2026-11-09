"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1" aria-label="Primary">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "bg-white/10 px-3 py-2 text-sm text-white" : "px-3 py-2 text-sm text-white/75 hover:bg-white/5"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
