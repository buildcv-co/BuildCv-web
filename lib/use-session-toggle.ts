"use client";

import { useCallback, useState } from "react";

function readSessionToggle(key: string, defaultEnabled: boolean): boolean {
  if (typeof window === "undefined") return defaultEnabled;
  const stored = window.sessionStorage.getItem(key);
  return stored === null ? defaultEnabled : stored === "true";
}

export function useSessionToggle(key: string, defaultEnabled = true) {
  const [enabled, setEnabledState] = useState(() => readSessionToggle(key, defaultEnabled));

  const setEnabled = useCallback(
    (next: boolean) => {
      window.sessionStorage.setItem(key, String(next));
      setEnabledState(next);
    },
    [key],
  );

  return { enabled, setEnabled };
}
