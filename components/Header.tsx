"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";

const links = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/#what-you-learn", label: "What you learn" },
  { href: "/#enrol", label: "Enrol" },
];

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/courses") return pathname.startsWith("/courses");
  return false;
}

function NavLinks({ pathname }: { pathname: string }) {
  return links.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      className="nav-link"
      aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
    >
      {link.label}
    </Link>
  ));
}

export function Header() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link href="/" className="brand" aria-label="Lerniqo, home">
          <Logo alt="" />
        </Link>
        <nav className="desktop-nav" aria-label="Primary">
          <NavLinks pathname={pathname} />
        </nav>
        <details className="mobile-nav" ref={menuRef}>
          <summary>
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            Menu
          </summary>
          <nav className="mobile-panel" aria-label="Primary">
            <NavLinks pathname={pathname} />
          </nav>
        </details>
      </div>
    </header>
  );
}
