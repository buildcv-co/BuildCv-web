"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { WompiEventDetail, WompiInstance, WompiWidgetProps } from "./wompi-types";

const WOMPI_WIDGET_SRC = "https://checkout.wompi.co/widget.js";

export function WompiWidget({
  session,
  onClose,
  onApproved,
  onDeclined,
  onEvent,
  locale = "es",
}: WompiWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<WompiInstance | null>(null);

  const mount = useCallback(() => {
    if (typeof window === "undefined") return;
    if (instanceRef.current) return;
    const api = window.WidgetCheckout;
    if (!api || !containerRef.current) return;

    instanceRef.current = api.open({
      currency: session.currency,
      amountInCents: session.amountInCents,
      reference: session.reference,
      publicKey: session.publicKey,
      sessionId: session.sessionId,
    });

    if (onClose) instanceRef.current.on("onClose", onClose);
    if (onApproved) instanceRef.current.on("onApproved", onApproved);
    if (onDeclined) instanceRef.current.on("onDeclined", onDeclined);
    if (onEvent) instanceRef.current.on("onEvent", onEvent as (d: WompiEventDetail) => void);
  }, [session, onClose, onApproved, onDeclined, onEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.WidgetCheckout) {
      mount();
      return;
    }
    const id = window.setInterval(() => {
      if (window.WidgetCheckout) {
        window.clearInterval(id);
        mount();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [mount]);

  useEffect(() => {
    return () => {
      instanceRef.current?.unmount?.();
      instanceRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="wompi-widget"
      data-locale={locale}
      className={cn("w-full min-h-[480px] rounded-2xl border border-line bg-surface/30 p-4")}
    >
      <Script
        src={WOMPI_WIDGET_SRC}
        strategy="afterInteractive"
        onLoad={mount}
        onReady={mount}
      />
    </div>
  );
}
