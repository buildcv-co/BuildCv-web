import type { Metadata } from "next";
import { copy } from "@/lib/copy/es";
import { SubscriptionDashboard } from "@/components/subscriptions/subscription-dashboard";

export const metadata: Metadata = {
  title: `${copy.appName} — ${copy.subscription.activeTitle}`,
  description: copy.subscription.renewsAutomatically,
};

export default function SubscriptionsPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col gap-6 px-6 py-12">
      <section aria-labelledby="subscriptions-heading">
        <h1 id="subscriptions-heading" className="font-display text-3xl text-fg">{copy.subscription.activeTitle}</h1>
        <p className="mt-1 text-sm text-fg/70">{copy.subscription.renewsAutomatically}</p>
      </section>
      <SubscriptionDashboard />
    </main>
  );
}