"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export type SubscriptionPlanId = "starter" | "standard";

type SubscribeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (plan: SubscriptionPlanId, paymentSourceId: string) => Promise<void>;
};

const PLANS: ReadonlyArray<{ id: SubscriptionPlanId; price: string; copyKey: "planStarter" | "planStandard"; savingsKey: "savingsVsOneTime" | null }> = [
  { id: "starter", price: "$30.000 COP", copyKey: "planStarter", savingsKey: null },
  { id: "standard", price: "$80.000 COP", copyKey: "planStandard", savingsKey: "savingsVsOneTime" },
];

export function SubscribeModal({ open, onClose, onConfirm }: SubscribeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>("starter");
  const [paymentSourceId, setPaymentSourceId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const headingId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentSourceId.trim()) {
      setErrorMessage(copy.subscription.errorGeneric);
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm(selectedPlan, paymentSourceId.trim());
    } catch {
      setErrorMessage(copy.subscription.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm, paymentSourceId, selectedPlan]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      data-testid="subscribe-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg rounded-2xl border border-line bg-bg p-6 shadow-2xl focus:outline-none"
      >
        <h2 id={headingId} className="font-display text-2xl text-fg">
          {copy.subscription.activeTitle}
        </h2>
        <p className="mt-1 text-sm text-fg/70">{copy.subscription.renewsAutomatically}</p>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-fg/80">{copy.subscription.planLabel}</legend>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <label
                  key={plan.id}
                  data-testid={`plan-option-${plan.id}`}
                  data-selected={isSelected}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition",
                    isSelected
                      ? "border-accent bg-accent/10"
                      : "border-line bg-surface/40 hover:border-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan.id}
                    checked={isSelected}
                    onChange={() => setSelectedPlan(plan.id)}
                    className="sr-only"
                  />
                  <span className="block text-sm font-semibold capitalize text-fg">{plan.id}</span>
                  <span className="mt-1 block text-sm text-fg/70">{plan.price}</span>
                  <span className="mt-2 block text-xs text-fg/60">{copy.subscription[plan.copyKey]}</span>
                  {plan.savingsKey && (
                    <span className="mt-2 inline-block rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                      {copy.subscription[plan.savingsKey]}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="payment-source" className="block text-sm font-medium text-fg/80">
              Wompi payment source
            </label>
            <input
              id="payment-source"
              type="text"
              value={paymentSourceId}
              onChange={(event) => setPaymentSourceId(event.target.value)}
              placeholder="ps_test_xxx"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-line bg-surface/60 px-3 py-2 text-sm text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>

          {errorMessage && (
            <p
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
            >
              {errorMessage}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.subscription.confirmCancelKeep}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
            >
              {submitting ? "…" : copy.subscription.subscribeCta}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}