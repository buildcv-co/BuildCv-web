"use client";

import { EmptyState } from "@/components/common/empty-state";
import { UserIcon } from "@/components/common/icons";
import { copy } from "@/lib/copy/es";

interface SubscriptionsEmptyProps {
  readonly callbackUrl: string;
}

export function SubscriptionsEmpty({ callbackUrl }: SubscriptionsEmptyProps) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 py-12">
      <EmptyState
        icon={<UserIcon />}
        title={copy.emptyStates.subscriptions.title}
        description={copy.emptyStates.subscriptions.description}
        ctaLabel={copy.emptyStates.subscriptions.primaryCta}
        ctaHref={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
      />
    </main>
  );
}