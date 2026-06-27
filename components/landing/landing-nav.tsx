"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IS_LOCAL } from "@/lib/auth";
import { copy } from "@/lib/copy/es";
import { useUserMenu } from "@/lib/use-user-menu";

export interface NavItem {
  readonly href: string;
  readonly label: string;
  /**
   * When true, the link should be filtered out for anonymous users.
   * Reserved for v1 (auth-web); PR1 always passes all items visible.
   */
  readonly requiresAuth?: boolean;
}

export const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/", label: copy.nav.global.home },
  { href: "/analizar", label: copy.nav.global.analyze },
  { href: "/importar", label: copy.nav.global.import },
  { href: "/suscripciones", label: copy.nav.global.subscriptions },
  { href: "/auth/signin", label: copy.nav.global.account },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LandingNav() {
  if (IS_LOCAL) {
    return <LandingNavContent status="unauthenticated" />;
  }

  return <LandingNavWithSession />;
}

function LandingNavWithSession() {
  const { status } = useUserMenu();
  return <LandingNavContent status={status} />;
}

function LandingNavContent({ status }: { readonly status: "loading" | "authenticated" | "unauthenticated" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="flex items-center gap-2 sm:gap-4">
      {NAV_ITEMS.filter((item) => status !== "authenticated" || item.href !== "/auth/signin").map((item) => {
        const active = isActive(pathname ?? "/", item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-testid={`nav-link-${item.href.replaceAll("/", "_") || "_root"}`}
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
