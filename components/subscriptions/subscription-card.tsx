"use client";

import { useCallback } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type SubscriptionViewModel = {
  id: string;
  plan: "starter" | "standard";
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  nextChargeAt: string;
  canceledAt: string | null;
};

type SubscriptionCardProps = {
  subscription: SubscriptionViewModel | null;
  onSubscribe: () => void;
  onCancel: () => void;
};

export function SubscriptionCard({ subscription, onSubscribe, onCancel }: SubscriptionCardProps) {
  const handleSubscribe = useCallback(() => {
    onSubscribe();
  }, [onSubscribe]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  if (!subscription) {
    return (
      <section
        data-testid="subscription-card-empty"
        className={cn("rounded-2xl border border-line bg-surface/40 p-6")}
      >
        <h2 className="font-display text-xl text-fg">
          {copy.subscription.activeTitle}
        </h2>
        <p className="mt-2 text-sm text-fg/70">
          {copy.subscription.planStarter}
        </p>
        <p className="text-sm text-fg/70">{copy.subscription.planStandard}</p>
        <button
          type="button"
          onClick={handleSubscribe}
          className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={copy.subscription.subscribeCta}
        >
          {copy.subscription.subscribeCta}
        </button>
      </section>
    );
  }

  const isCanceled = subscription.status === "canceled";
  const planCopy = subscription.plan === "starter"
    ? copy.subscription.planStarter
    : copy.subscription.planStandard;

  const accessUntil = formatDate(subscription.currentPeriodEnd);

  return (
    <section
      data-testid="subscription-card"
      data-status={subscription.status}
      className={cn(
        "rounded-2xl border bg-surface/40 p-6",
        isCanceled ? "border-warning/40" : "border-line",
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-fg">
            {isCanceled ? copy.subscription.canceledTitle : copy.subscription.activeTitle}
          </h2>
          <p className="mt-1 text-sm text-fg/70">{planCopy}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isCanceled ? "bg-warning/20 text-warning" : "bg-success/15 text-success",
          )}
        >
          {subscription.status}
        </span>
      </div>

      {!isCanceled && (
        <p className="mt-3 text-sm text-fg/70">
          {copy.subscription.renewsAutomatically}
        </p>
      )}

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-fg/80 sm:grid-cols-2">
        <div>
          <dt className="text-fg/60">{copy.subscription.nextCharge}</dt>
          <dd className="font-medium">{isCanceled ? "—" : formatDate(subscription.nextChargeAt)}</dd>
        </div>
        <div>
          <dt className="text-fg/60">{copy.subscription.planLabel}</dt>
          <dd className="font-medium capitalize">{subscription.plan}</dd>
        </div>
      </dl>

      {isCanceled && (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          {copy.subscription.accessUntil.replace("{date}", accessUntil)}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {!isCanceled && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-line bg-transparent px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={copy.subscription.cancelCta}
          >
            {copy.subscription.cancelCta}
          </button>
        )}
        {isCanceled && (
          <button
            type="button"
            onClick={handleSubscribe}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.subscription.subscribeCta}
          </button>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}