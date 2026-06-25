"use client";

import { useCallback, useEffect, useState } from "react";
import { CancelModal } from "@/components/subscriptions/cancel-modal";
import { SubscribeModal } from "@/components/subscriptions/subscribe-modal";
import { SubscriptionCard, type SubscriptionViewModel } from "@/components/subscriptions/subscription-card";

async function fetchSubscription(): Promise<SubscriptionViewModel | null> {
  const response = await fetch("/api/subscriptions", {
    method: "GET",
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`SUBSCRIPTION/${response.status}`);
  const body = (await response.json()) as {
    id: string;
    plan: "starter" | "standard";
    status: "active" | "past_due" | "canceled";
    currentPeriodEnd: string;
    nextChargeAt: string;
    canceledAt: string | null;
  };
  return body;
}

async function subscribe(
  plan: "starter" | "standard",
  paymentSourceId: string,
): Promise<SubscriptionViewModel> {
  const response = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan, paymentSourceId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : `SUBSCRIPTION/${response.status}`);
  }
  return (await response.json()) as SubscriptionViewModel;
}

async function cancelSubscription(): Promise<Date> {
  const response = await fetch("/api/subscriptions/cancel", { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.error === "string" ? body.error : `SUBSCRIPTION/${response.status}`);
  }
  const body = (await response.json()) as { accessUntil: string };
  return new Date(body.accessUntil);
}

export function SubscriptionDashboard() {
  const [subscription, setSubscription] = useState<SubscriptionViewModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscribeOpen, setSubscribeOpen] = useState<boolean>(false);
  const [cancelOpen, setCancelOpen] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetchSubscription()
      .then((sub) => {
        if (!cancelled) setSubscription(sub);
      })
      .catch(() => {
        if (!cancelled) setSubscription(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = useCallback(async (plan: "starter" | "standard", paymentSourceId: string) => {
    const created = await subscribe(plan, paymentSourceId);
    setSubscription(created);
    setSubscribeOpen(false);
  }, []);

  const handleCancel = useCallback(async () => {
    await cancelSubscription();
    const refreshed = await fetchSubscription();
    setSubscription(refreshed);
    setCancelOpen(false);
  }, []);

  if (loading) {
    return <p data-testid="subscription-loading">…</p>;
  }

  return (
    <>
      <SubscriptionCard
        subscription={subscription}
        onSubscribe={() => setSubscribeOpen(true)}
        onCancel={() => setCancelOpen(true)}
      />
      <SubscribeModal
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
        onConfirm={handleSubscribe}
      />
      <CancelModal
        open={cancelOpen}
        accessUntil={subscription?.currentPeriodEnd ?? null}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
      />
    </>
  );
}