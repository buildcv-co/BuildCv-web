"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, safeRequestAnimationFrame, safeCancelAnimationFrame } from "@/lib/utils/prefers-reduced-motion";

const SIZE = 260;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function toneFor(score: number): string {
  if (score >= 65) return "var(--color-present)";
  if (score >= 40) return "var(--color-partial)";
  return "var(--color-missing)";
}

export function ScoreGauge({
  score,
  band,
  label,
}: {
  score: number;
  band: string;
  label: string;
}) {
  const [shown, setShown] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduce = prefersReducedMotion();
    const duration = reduce ? 0 : 1100;
    let raf: number = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * score));
      setProgress(eased * score);
      if (t < 1) raf = safeRequestAnimationFrame(tick);
    };
    raf = safeRequestAnimationFrame(tick);
    return () => safeCancelAnimationFrame(raf);
  }, [score]);

  const tone = toneFor(score);
  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`Puntaje ${score} de 100, ${band}`}
    >
      {/* max-w-[200px] en mobile, max-w-[220px] en tablet (sm:), max-w-none en desktop (md:).
          Esto evita que el gauge se estire al 100% del ancho en mobile. */}
      <div className="relative w-[200px] max-w-full sm:w-[220px] md:w-[260px]">
        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={tone}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-[5.5rem] font-semibold leading-none tabular-nums"
              style={{ color: tone }}
            >
              {shown}
            </span>
            <span className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-faint">
              / 100
            </span>
          </div>
        </div>
      </div>
      <p className="mt-5 font-display text-2xl" style={{ color: tone }}>
        {band}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
