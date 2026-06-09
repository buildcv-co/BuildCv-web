"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy/es";

interface NavItem {
  readonly href: string;
  readonly label: string;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/", label: "Inicio" },
  { href: "/analizar", label: copy.nav.analyze },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LandingNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-4">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname ?? "/", item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full border border-accent px-3 py-1.5 text-sm text-accent sm:px-4 sm:py-2"
                : "rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-muted hover:text-ink sm:px-4 sm:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
