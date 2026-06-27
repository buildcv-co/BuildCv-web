"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { IS_LOCAL } from "@/lib/auth";
import { useUserMenu } from "@/lib/use-user-menu";
import { signOut } from "@/lib/api/sign-out";
import { copy } from "@/lib/copy/es";
export function UserMenu(): React.ReactElement | null {
  if (IS_LOCAL) {
    return null;
  }

  return <UserMenuContent />;
}

function UserMenuContent(): React.ReactElement {
  const { status, user } = useUserMenu();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);

  const syncOpen = useCallback((next: boolean) => {
    setIsOpen(next);
    isOpenRef.current = next;
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = (): void => {
      syncOpen(false);
      triggerRef.current?.focus();
    };
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [syncOpen]);

  if (status === "loading") {
    return (
      <div
        data-testid="user-menu-loading"
        role="status"
        aria-busy="true"
        aria-label={copy.userMenu.triggerLoading}
        className="min-h-16 w-32 animate-pulse rounded-full bg-stone-800"
      />
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <Link
        href="/auth/signin"
        data-testid="user-menu-signin"
        className="inline-flex h-11 items-center rounded-full border border-line bg-surface/50 px-4 text-sm font-medium text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {copy.userMenu.signIn}
      </Link>
    );
  }

  const avatarInitial = user.email.charAt(0).toLowerCase() || "·";

  const openDialog = (): void => {
    dialogRef.current?.showModal();
    syncOpen(true);
  };

  const closeDialog = (): void => {
    dialogRef.current?.close();
    syncOpen(false);
    triggerRef.current?.focus();
  };

  const handleSignOut = (): void => {
    void signOut().catch(() => undefined);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="user-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={openDialog}
        aria-label={copy.userMenu.triggerLabel(user.email)}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-surface/50 px-3 text-sm text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 font-mono text-xs uppercase text-accent"
        >
          {avatarInitial}
        </span>
        <span className="hidden sm:inline">{user.email}</span>
      </button>
      <dialog
        id={dialogId}
        ref={dialogRef}
        aria-label={copy.userMenu.dialogLabel}
        data-testid="user-menu-dialog"
        className="rounded-lg border border-line bg-surface p-4 text-foreground shadow-lg backdrop:bg-black/40"
      >
        <ul role="menu" className="flex flex-col gap-1">
          <li role="none">
            <Link
              role="menuitem"
              href="/cuenta"
              data-testid="user-menu-my-account"
              className="block rounded px-3 py-2 text-sm transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.userMenu.myAccount}
            </Link>
          </li>
          <li role="none">
            <button
              role="menuitem"
              type="button"
              data-testid="user-menu-signout"
              onClick={handleSignOut}
              className="block w-full rounded px-3 py-2 text-left text-sm transition hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.userMenu.signOut}
            </button>
          </li>
        </ul>
        <button
          type="button"
          onClick={closeDialog}
          aria-label={copy.userMenu.closeLabel}
          data-testid="user-menu-close"
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
      </dialog>
    </>
  );
}
