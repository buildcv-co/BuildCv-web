"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/lib/copy/es";
import type { NavItem } from "./landing-nav";

interface MobileNavProps {
  readonly items: ReadonlyArray<NavItem>;
}

/**
 * MobileNav — hamburger button (< sm) + native <dialog> with the same
 * nav items as <LandingNav>. Uses the platform <dialog> for native
 * focus trap, Esc-to-close and inert-background (no Headless UI,
 * no Radix, no shadcn — Art. VI 'no sobre-ingeniería').
 * Visible only below 640px via Tailwind `sm:hidden` on the trigger.
 *
 * A11y (WCAG 2.2):
 * - 2.4.3 Focus Order: native dialog handles trap; explicit focus
 *   return on close() AND onClose (belt-and-suspenders for Esc).
 * - 4.1.2 Name, Role, Value: aria-label, aria-expanded, aria-controls.
 * - 2.5.8 Target Size: button uses px-4 py-3 → ≥ 44px square.
 *
 * Reduced motion: backdrop fade honored by globals.css's
 * `prefers-reduced-motion: reduce` rule (animation-duration: 0.001ms).
 */
export function MobileNav({ items }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const pathname = usePathname();
  const dialogId = useId();

  const syncIsOpen = useCallback((next: boolean) => {
    setIsOpen(next);
    isOpenRef.current = next;
  }, []);

  const open = useCallback(() => {
    dialogRef.current?.showModal();
    syncIsOpen(true);
  }, [syncIsOpen]);

  const close = useCallback(() => {
    dialogRef.current?.close();
    syncIsOpen(false);
    triggerRef.current?.focus();
  }, [syncIsOpen]);

  useEffect(() => {
    if (isOpenRef.current && dialogRef.current?.open) {
      dialogRef.current.close();
      syncIsOpen(false);
    }
  }, [pathname, syncIsOpen]);

  const returnFocusToTrigger = useCallback(() => {
    syncIsOpen(false);
    triggerRef.current?.focus();
  }, [syncIsOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.nav.mobileMenu.openLabel}
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={open}
        data-testid="mobile-nav-trigger"
        className="sm:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/50 text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="h-5 w-5"
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      <dialog
        id={dialogId}
        ref={dialogRef}
        aria-label={copy.nav.mobileMenu.dialogLabel}
        onClose={returnFocusToTrigger}
        data-testid="mobile-nav-dialog"
        className="m-0 ml-auto h-full max-h-screen w-full max-w-sm border-l border-line bg-canvas p-0 text-ink backdrop:bg-black/60"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="font-display text-lg">{copy.appName}</span>
            <button
              type="button"
              onClick={close}
              aria-label={copy.nav.mobileMenu.closeLabel}
              data-testid="mobile-nav-close"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/50 text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-5 w-5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
          <nav aria-label="Navegación móvil" className="flex flex-col gap-1 p-5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                data-testid={`mobile-nav-link-${item.href.replaceAll("/", "_") || "_root"}`}
                className="rounded-full border border-line px-4 py-3 text-sm text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}