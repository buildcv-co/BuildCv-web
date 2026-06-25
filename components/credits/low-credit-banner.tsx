"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const LOW_THRESHOLD = (() => {
  const raw = process.env.NEXT_PUBLIC_LOW_CREDIT_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 2;
})();

export function LowCreditBanner({ balance }: { balance: number }) {
  if (balance > LOW_THRESHOLD) {
    return null;
  }

  const isZero = balance === 0;
  const noun = balance === 1 ? "crédito" : "créditos";

  return (
    <div
      role="alert"
      data-testid="low-credit-banner"
      data-state={isZero ? "zero" : "low"}
      className={cn(
        "space-y-2 rounded-xl border p-4 text-sm",
        isZero
          ? "border-red-300 bg-red-50 text-red-900"
          : "border-amber-300 bg-amber-50 text-amber-900",
      )}
    >
      <p className="font-medium">
        Te quedan {balance} {noun}.
      </p>
      <p>
        {isZero
          ? "Sin créditos — comprá más para seguir adaptando tu CV."
          : "Estás por quedarte sin créditos. Comprá más antes de que se agoten."}
      </p>
      <Link
        href="/pricing"
        data-testid="buy-credits-link"
        className="inline-block underline underline-offset-2"
      >
        Comprar más créditos
      </Link>
    </div>
  );
}
