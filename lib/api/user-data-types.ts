/**
 * Tipos + clases de error compartidas entre el puerto server-only
 * (`lib/api/user-data.ts`) y el hook client-side (`lib/use-arco.ts`).
 *
 * **Cliente-seguro**: este módulo NO importa `next/headers`, `node:crypto`,
 * ni nada de `lib/api/jwt.ts`. Lo pueden importar componentes con `"use client"`
 * sin disparar el error "next/headers is only available in Server Components".
 *
 * El split existe para evitar el acoplamiento cliente↔servidor que rompía
 * el build de PR6 cuando `<ArcoPanel>` (client) intentaba importar
 * `rectifyUserData`/`deleteUserData` desde el módulo server-only.
 */

export interface UserDataResponse {
  userId: string;
  provider: "google" | "linkedin";
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface RectifyPayload {
  name?: string;
  email?: string;
}

export class RateLimitError extends Error {
  public readonly retryAfter: Date | null;
  public readonly detail: string;

  constructor(retryAfter: Date | null, detail: string) {
    super(`Rate limit exceeded (retryAfter=${retryAfter?.toISOString() ?? "unknown"}): ${detail}`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.detail = detail;
  }
}

export class UserDataError extends Error {
  public readonly status: number;
  public readonly detail: string;

  constructor(status: number, detail: string) {
    super(`User data error (status=${status}): ${detail}`);
    this.name = "UserDataError";
    this.status = status;
    this.detail = detail;
  }
}

export class ValidationError extends Error {
  public readonly status: 400;
  public readonly detail: string;

  constructor(detail: string) {
    super(`Validation error (status=400): ${detail}`);
    this.name = "ValidationError";
    this.status = 400;
    this.detail = detail;
  }
}