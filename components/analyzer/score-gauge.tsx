"use client";

import { useEffect, useState } from "react";

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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 1100;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * score));
      setProgress(eased * score);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const tone = toneFor(score);
  const offset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div
      className="flex flex-col items-center"
      role="img"
      aria-label={`Puntaje ${score} de 100, ${band}`}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
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
      <p className="mt-5 font-display text-2xl" style={{ color: tone }}>
        {band}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}
