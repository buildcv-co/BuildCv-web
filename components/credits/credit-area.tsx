"use client";

import { useEffect, useState } from "react";
import { fetchBalance, CreditError } from "@/lib/api/credits";
import { cn } from "@/lib/utils/cn";

const POLL_INTERVAL_MS = 30_000;

const LOW_THRESHOLD = (() => {
  const raw = process.env.NEXT_PUBLIC_LOW_CREDIT_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 2;
})();

type Status = "idle" | "ready" | "error";

export function CreditArea({ onBalanceChange }: { onBalanceChange?: (balance: number) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const next = await fetchBalance();
        if (!cancelled) {
          setBalance(next.balance);
          setStatus("ready");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof CreditError && err.status === 401) {
          setStatus("idle");
          setBalance(null);
          return;
        }
        setStatus("error");
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (balance !== null && onBalanceChange) {
      onBalanceChange(balance);
    }
  }, [balance, onBalanceChange]);

  if (status === "idle" || balance === null) {
    return (
      <span
        data-testid="credit-badge"
        data-state="loading"
        aria-label="Cargando créditos"
        className="font-mono text-xs text-faint"
      >
        —
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        data-testid="credit-badge"
        data-state="error"
        aria-label="Créditos no disponibles"
        className="font-mono text-xs text-faint"
      >
        ···
      </span>
    );
  }

  const isZero = balance === 0;
  const isLow = balance <= LOW_THRESHOLD;
  const noun = balance === 1 ? "crédito" : "créditos";

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        data-testid="credit-badge"
        data-state={isZero ? "zero" : isLow ? "low" : "ok"}
        data-balance={balance}
        aria-live="polite"
        className={cn(
          "font-mono text-xs",
          isZero ? "font-bold text-red-600" : isLow ? "text-amber-600" : "text-muted",
        )}
      >
        {balance} {noun}
      </span>
      {balance <= LOW_THRESHOLD && (
        <div
          role="alert"
          data-testid="low-credit-banner"
          data-state={isZero ? "zero" : "low"}
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            isZero
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-amber-300 bg-amber-50 text-amber-900",
          )}
        >
          <span className="font-medium">
            Te quedan {balance} {noun}.{" "}
          </span>
          <a
            href="/pricing"
            data-testid="buy-credits-link"
            className="underline underline-offset-2"
          >
            {isZero ? "Sin créditos — comprá más" : "Comprar más"}
          </a>
        </div>
      )}
    </div>
  );
}
