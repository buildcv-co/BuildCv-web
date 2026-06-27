import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * Tests del hook `useArco` (009-auth-web PR6 — T-PR6-004).
 *
 * Spec: REQ-FN-015 + REQ-FN-016 + REQ-FN-021 + R16 (email-rotation auto-sign-out).
 *
 * El hook llama a la BFF `/api/user/data` (PUT/DELETE) via fetch, NO al
 * puerto server-only `lib/api/user-data`. Esto significa que en los tests
 * mockeamos `global.fetch`, no las funciones del port.
 *
 * Comportamiento:
 *  - Estado inicial derivado del `userData` prop.
 *  - `rectify(payload)` PUT a `/api/user/data`. Si el email cambia, dispara
 *    `onEmailRotated(newEmail)` para `signOutAndClear()` (R16).
 *  - `cancel()` DELETE a `/api/user/data`.
 *  - 429 → status "error" + `RateLimitError`. 400 → `ValidationError`.
 *  - NO loguea email/name (Art. III / NFR-OBS-1).
 */

const ORIGINAL_FETCH = global.fetch;

async function loadHook() {
  return await import("@/lib/use-arco");
}

beforeEach(() => {
  vi.resetModules();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

const SESSION_USER = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google" as const,
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00Z",
  lastLoginAt: "2026-06-26T08:00:00Z",
};

describe("useArco (hook — T-PR6-004)", () => {
  it("estado inicial derivado del `userData` prop y `status: 'idle'`", async () => {
    const { useArco } = await loadHook();
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated: vi.fn() }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
    expect(result.current.sessionEmail).toBe("ada@example.com");
  });

  it("`rectify` con email distinto al de la sesión dispara `onEmailRotated(newEmail)` (R16)", async () => {
    const { useArco } = await loadHook();
    const onEmailRotated = vi.fn();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...SESSION_USER,
          email: "ada-new@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ email: "ada-new@example.com" });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("/api/user/data");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledInit.method).toBe("PUT");
    expect(calledInit.body).toBe(
      JSON.stringify({ email: "ada-new@example.com" }),
    );
    expect(onEmailRotated).toHaveBeenCalledTimes(1);
    expect(onEmailRotated).toHaveBeenCalledWith("ada-new@example.com");
    expect(result.current.status).toBe("success");
  });

  it("`rectify` con email igual al de la sesión NO dispara `onEmailRotated`", async () => {
    const { useArco } = await loadHook();
    const onEmailRotated = vi.fn();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...SESSION_USER, name: "Ada Lovelace v2" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ name: "Ada Lovelace v2" });
    });

    expect(onEmailRotated).not.toHaveBeenCalled();
    expect(result.current.status).toBe("success");
  });

  it("`rectify` con error 429 → status 'error' + `RateLimitError` con `retryAfter: Date`", async () => {
    const { useArco } = await loadHook();
    const onEmailRotated = vi.fn();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Too many" }), {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ email: "x@y.co" });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error?.name).toBe("RateLimitError");
    expect((result.current.error as { retryAfter?: Date })?.retryAfter).toBeInstanceOf(Date);
    expect(onEmailRotated).not.toHaveBeenCalled();
  });

  it("`cancel` llama DELETE a `/api/user/data`", async () => {
    const { useArco } = await loadHook();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "User data deleted" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated: vi.fn() }),
    );

    await act(async () => {
      await result.current.cancel();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("/api/user/data");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledInit.method).toBe("DELETE");
    expect(result.current.status).toBe("success");
  });
});