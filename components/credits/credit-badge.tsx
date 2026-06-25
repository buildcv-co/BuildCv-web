"use client";

import { useEffect, useState } from "react";
import { fetchBalance, CreditError, type CreditBalance } from "@/lib/api/credits";
import { cn } from "@/lib/utils/cn";

const POLL_INTERVAL_MS = 30_000;

const LOW_THRESHOLD = (() => {
  const raw = process.env.NEXT_PUBLIC_LOW_CREDIT_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : 2;
})();

type Status = "idle" | "loading" | "ready" | "error";

export function CreditBadge({ onBalanceChange }: { onBalanceChange?: (balance: number) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [balance, setBalance] = useState<CreditBalance | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const next = await fetchBalance();
        if (!cancelled) {
          setBalance(next);
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
    if (balance && onBalanceChange) {
      onBalanceChange(balance.balance);
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

  const isZero = balance.balance === 0;
  const isLow = balance.balance <= LOW_THRESHOLD;
  const noun = balance.balance === 1 ? "crédito" : "créditos";

  return (
    <span
      data-testid="credit-badge"
      data-state={isZero ? "zero" : isLow ? "low" : "ok"}
      data-balance={balance.balance}
      aria-live="polite"
      className={cn(
        "font-mono text-xs",
        isZero ? "font-bold text-red-600" : isLow ? "text-amber-600" : "text-muted",
      )}
    >
      {balance.balance} {noun}
    </span>
  );
}
