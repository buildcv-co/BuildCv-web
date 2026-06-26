import Link from "next/link";
import { copy } from "@/lib/copy/es";
import { LandingNav, NAV_ITEMS, type NavItem } from "./landing-nav";
import { LocalModePill } from "./local-mode-pill";
import { MobileNav } from "./mobile-nav";

interface SiteHeaderProps {
  /**
   * Optional right-side slot for auth-aware UI (UserMenu, CreditBadge).
   * When undefined or null, no wrapper element is rendered (no orphan
   * <div> in the DOM). Composed by the layout, NOT by SiteHeader —
   * SiteHeader is a presentational composition root (Art. VI).
   */
  readonly extras?: React.ReactNode;
}

/**
 * SiteHeader — composition root for the persistent site header.
 * Renders <header role='banner'> with the brand mark, the inline
 * <LandingNav> (≥sm), the <MobileNav> (<sm, hamburger + dialog),
 * the <LocalModePill> (when IS_LOCAL), and an optional <HeaderExtras>
 * slot. Server component shell; MobileNav is the only client island.
 * `min-h-16` reserves CLS space.
 */
export function SiteHeader({ extras }: SiteHeaderProps) {
  return (
    <header
      role="banner"
      data-testid="site-header"
      className="min-h-16 border-b border-line bg-canvas/80 backdrop-blur supports-[backdrop-filter]:bg-canvas/60"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link
          href="/"
          data-testid="brand-mark"
          className="font-display text-xl text-ink transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.appName}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex">
            <LandingNav />
          </div>
          <MobileNav items={NAV_ITEMS} />
          <LocalModePill />
          {extras ? (
            <div data-testid="header-extras" className="flex items-center gap-3">
              {extras}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export { NAV_ITEMS, type NavItem };