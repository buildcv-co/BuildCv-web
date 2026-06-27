"use client";

import { signIn } from "next-auth/react";
import { redirect, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { copy } from "@/lib/copy/es";
import { IS_LOCAL } from "@/lib/auth";

function SignInInner() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/analizar";
  const error = searchParams.get("error");
  const reason = searchParams.get("reason");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 py-12">
      <h1 className="font-display text-3xl">{copy.appName}</h1>
      <p className="text-sm text-muted">{copy.signIn.intro}</p>
      {reason === "email-rotated" ? (
        <p
          role="alert"
          aria-live="polite"
          data-testid="email-rotated-banner"
          className="rounded border border-line bg-surface/60 px-4 py-3 text-sm"
        >
          {copy.signIn.emailRotatedBanner}
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-400">{copy.signIn.errorPrefix}: {error}</p> : null}
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="rounded-md border border-line bg-surface/50 px-6 py-3 text-sm font-medium transition hover:bg-surface"
        >
          {copy.signIn.continueWithGoogle}
        </button>
        <button
          type="button"
          onClick={() => signIn("linkedin", { callbackUrl })}
          className="rounded-md border border-line bg-surface/50 px-6 py-3 text-sm font-medium transition hover:bg-surface"
        >
          {copy.signIn.continueWithLinkedIn}
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  if (IS_LOCAL) {
    redirect("/analizar");
  }
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-md px-6 py-12 text-sm text-muted">Cargando…</div>}>
      <SignInInner />
    </Suspense>
  );
}
