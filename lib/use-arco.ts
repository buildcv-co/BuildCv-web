"use client";

import { useCallback, useState } from "react";
import {
  RateLimitError,
  UserDataError,
  ValidationError,
  type RectifyPayload,
  type UserDataResponse,
} from "@/lib/api/user-data-types";

/**
 * Hook de estado para la sección ARCO (009-auth-web PR6 — T-PR6-004).
 *
 * Spec: REQ-FN-015 + REQ-FN-016 + REQ-FN-021 + R16 (email-rotation
 * auto-sign-out).
 *
 * Llama a las BFF same-origin (`/api/user/data` PUT + DELETE). NO
 * importa `lib/api/user-data` (server-only) — la separación está en
 * `lib/api/user-data-types.ts` (tipos + clases de error, cliente-seguro).
 *
 * Encapsula:
 *  - `rectify(payload)`: PUT `/api/user/data`. Si el email de la respuesta
 *    difiere del email de la sesión, dispara `onEmailRotated(newEmail)`
 *    para que el caller ejecute `signOutAndClear()` + redirect.
 *    Compara case-insensitive (REQ-FN-021: cualquier rotación, no solo
 *    case-only).
 *  - `cancel()`: DELETE `/api/user/data`. NO dispara `onEmailRotated` (la
 *    cuenta se elimina; el caller hace `signOutAndClear()` desde el modal
 *    ARCO Cancel).
 *  - `status`: "idle" | "loading" | "success" | "error".
 *  - `error`: última excepción (`RateLimitError`, `ValidationError`,
 *    `UserDataError`). NO se loguea al cliente (NFR-OBS-1).
 *
 * **NO expone el email del usuario al servidor de telemetría** — la
 * comparación email-vs-sesión es client-side y no toca `console.*`.
 *
 * **NO** toca `localStorage` / cookies — sólo consume las BFF same-origin
 * que reusan el cache BFF server-side (`lib/api/jwt.ts`).
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

async function parseBackendError(response: Response): Promise<Error> {
  let detail = `BFF status=${response.status}`;
  try {
    const problem = (await response.json()) as {
      detail?: string;
      message?: string;
      title?: string;
    };
    detail = problem.detail ?? problem.message ?? problem.title ?? detail;
  } catch {
    // respuesta sin cuerpo JSON
  }
  if (response.status === 429) {
    const retryAfterRaw = response.headers.get("Retry-After");
    let retryAfter: Date | null = null;
    if (retryAfterRaw) {
      const trimmed = retryAfterRaw.trim();
      if (/^\d+$/.test(trimmed)) {
        const seconds = Number(trimmed);
        if (Number.isFinite(seconds) && seconds > 0) {
          retryAfter = new Date(Date.now() + seconds * 1000);
        }
      } else {
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) retryAfter = parsed;
      }
    }
    return new RateLimitError(retryAfter, detail);
  }
  if (response.status === 400) return new ValidationError(detail);
  return new UserDataError(response.status, detail);
}

function isUserDataResponse(value: unknown): value is UserDataResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "string" &&
    typeof v.provider === "string" &&
    typeof v.email === "string" &&
    typeof v.name === "string" &&
    typeof v.createdAt === "string" &&
    typeof v.lastLoginAt === "string" &&
    (v.provider === "google" || v.provider === "linkedin")
  );
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
        const response = await fetch("/api/user/data", {
          method: "PUT",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw await parseBackendError(response);
        }
        const data: unknown = await response.json();
        if (!isUserDataResponse(data)) {
          throw new UserDataError(502, "Malformed BFF response");
        }
        if (data.email && !emailsEqual(data.email, sessionEmail)) {
          onEmailRotated(data.email);
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
      const response = await fetch("/api/user/data", {
        method: "DELETE",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw await parseBackendError(response);
      }
      setStatus("success");
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      setError(e);
      setStatus("error");
    }
  }, []);

  return { status, error, sessionEmail, rectify, cancel };
}