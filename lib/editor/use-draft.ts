"use client";

import { useCallback, useEffect, useState } from "react";
import { getCvStore } from "@/lib/storage";
import type { Draft } from "./types";

export interface UseDraftResult {
  draft: Draft | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  save: (draft: Draft) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useDraft(): UseDraftResult {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const store = await getCvStore();
      const result = await store.load("default");
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (next: Draft) => {
    setIsSaving(true);
    setError(null);
    try {
      const store = await getCvStore();
      await store.save(next);
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setError(null);
    try {
      const store = await getCvStore();
      await store.clear("default");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      void load();
    }, 0);
    return () => {
      clearTimeout(handle);
    };
  }, [load]);

  return { draft, isLoading, isSaving, error, save, clear, reload: load };
}
