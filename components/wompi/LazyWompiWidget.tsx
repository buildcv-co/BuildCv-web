"use client";

import dynamic from "next/dynamic";
import type { WompiWidgetProps } from "./wompi-types";

const WompiWidget = dynamic(
  () => import("./WompiWidget").then((m) => m.WompiWidget),
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="wompi-widget-loading"
        className="flex min-h-[480px] w-full items-center justify-center rounded-2xl border border-line bg-surface/30 p-4 text-sm text-muted"
      >
        Cargando el widget de pago…
      </div>
    ),
  },
);

export function LazyWompiWidget(props: WompiWidgetProps) {
  return <WompiWidget {...props} />;
}

export type { WompiWidgetProps };
