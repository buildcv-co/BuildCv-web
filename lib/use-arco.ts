"use client";

import { useCallback, useState } from "react";
import {
  deleteUserData,
  rectifyUserData,
  type RectifyPayload,
  type UserDataResponse,
} from "@/lib/api/user-data";

/**
 * Hook de estado para la sección ARCO (009-auth-web PR6 — T-PR6-004).
 *
 * Spec: REQ-FN-015 + REQ-FN-016 + REQ-FN-021 + R16 (email-rotation
 * auto-sign-out).
 *
 * Encapsula:
 *  - `rectify(payload)`: PUT `/user/data`. Si el email de la respuesta
 *    difiere del email de la sesión, dispara `onEmailRotated(newEmail)`
 *    para que el caller ejecute `signOutAndClear()` + redirect.
 *    Compara case-insensitive (REQ-FN-021: cualquier rotación, no solo
 *    case-only).
 *  - `cancel()`: DELETE `/user/data`. NO dispara `onEmailRotated` (la
 *    cuenta se elimina; el caller hace `signOutAndClear()` desde el modal
 *    ARCO Cancel).
 *  - `status`: "idle" | "loading" | "success" | "error".
 *  - `error`: última excepción (`RateLimitError`, `ValidationError`,
 *    `UserDataError`). NO se loguea al cliente (NFR-OBS-1).
 *
 * **NO expone el email del usuario al servidor de telemetría** — la
 * comparación email-vs-sesión es client-side y no toca `console.*`.
 *
 * **NO** toca `localStorage` / cookies — sólo consume el cache BFF vía
 * `rectifyUserData` / `deleteUserData` (server-side ports).
 */
export type ArcoStatus = "idle" | "loading" | "success" | "error";

export interface UseArcoOptions {
  userData: UserDataResponse;
  onEmailRotated: (newEmail: string) => void;
}

export interface UseArcoResult {
  status: ArcoStatus;
  error: Error | null;
  sessionEmail: string;
  rectify: (payload: RectifyPayload) => Promise<void>;
  cancel: () => Promise<void>;
}

function emailsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function useArco({ userData, onEmailRotated }: UseArcoOptions): UseArcoResult {
  const [status, setStatus] = useState<ArcoStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const sessionEmail = userData.email;

  const rectify = useCallback(
    async (payload: RectifyPayload): Promise<void> => {
      setStatus("loading");
      setError(null);
      try {
        const updated = await rectifyUserData(payload);
        if (updated.email && !emailsEqual(updated.email, sessionEmail)) {
          onEmailRotated(updated.email);
        }
        setStatus("success");
      } catch (err) {
        const e = err instanceof Error ? err : new Error("Unknown error");
        setError(e);
        setStatus("error");
      }
    },
    [sessionEmail, onEmailRotated],
  );

  const cancel = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setError(null);
    try {
      await deleteUserData();
      setStatus("success");
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      setError(e);
      setStatus("error");
    }
  }, []);

  return { status, error, sessionEmail, rectify, cancel };
}