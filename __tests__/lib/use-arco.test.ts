import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/**
 * Tests del hook `useArco` (009-auth-web PR6 — T-PR6-004).
 *
 * Spec: REQ-FN-015 + REQ-FN-016 + REQ-FN-021 + R16 (email-rotation auto-sign-out).
 *
 * Contrato:
 *  - Estado inicial derivado del `userData` prop.
 *  - `rectify(payload)` llama a `rectifyUserData`, y si el email cambió
 *    respecto al email de la sesión, dispara `onEmailRotated(newEmail)`
 *    para que el caller ejecute `signOutAndClear()` (R16).
 *  - `cancel()` llama a `deleteUserData`.
 *  - Maneja 429 → status "error" + `RateLimitError` accesible vía `error`.
 *  - NO loguea email/name (Art. III / NFR-OBS-1).
 */

const ORIGINAL_FETCH = global.fetch;

const userDataModuleMock = {
  rectifyUserData: vi.fn(),
  deleteUserData: vi.fn(),
};

async function loadHook() {
  return await import("@/lib/use-arco");
}

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/api/user-data", () => userDataModuleMock);
  userDataModuleMock.rectifyUserData.mockReset();
  userDataModuleMock.deleteUserData.mockReset();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/api/user-data");
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
    userDataModuleMock.rectifyUserData.mockResolvedValueOnce({
      ...SESSION_USER,
      email: "ada-new@example.com",
    });
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ email: "ada-new@example.com" });
    });

    expect(userDataModuleMock.rectifyUserData).toHaveBeenCalledTimes(1);
    expect(userDataModuleMock.rectifyUserData).toHaveBeenCalledWith({
      email: "ada-new@example.com",
    });
    expect(onEmailRotated).toHaveBeenCalledTimes(1);
    expect(onEmailRotated).toHaveBeenCalledWith("ada-new@example.com");
    expect(result.current.status).toBe("success");
  });

  it("`rectify` con email igual al de la sesión NO dispara `onEmailRotated`", async () => {
    const { useArco } = await loadHook();
    const onEmailRotated = vi.fn();
    userDataModuleMock.rectifyUserData.mockResolvedValueOnce({
      ...SESSION_USER,
      name: "Ada Lovelace v2",
    });
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ name: "Ada Lovelace v2" });
    });

    expect(onEmailRotated).not.toHaveBeenCalled();
    expect(result.current.status).toBe("success");
  });

  it("`rectify` con error → status 'error' + expone `error` (no lo silencia)", async () => {
    const { useArco } = await loadHook();
    const onEmailRotated = vi.fn();
    const thrown = new Error("Rate limit exceeded (retryAfter=...): Too many");
    thrown.name = "RateLimitError";
    userDataModuleMock.rectifyUserData.mockRejectedValueOnce(thrown);
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated }),
    );

    await act(async () => {
      await result.current.rectify({ email: "x@y.co" });
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(thrown);
    expect(result.current.error?.name).toBe("RateLimitError");
    expect(onEmailRotated).not.toHaveBeenCalled();
  });

  it("`cancel` llama `deleteUserData`", async () => {
    const { useArco } = await loadHook();
    userDataModuleMock.deleteUserData.mockResolvedValueOnce({
      message: "User data deleted",
    });
    const { result } = renderHook(() =>
      useArco({ userData: SESSION_USER, onEmailRotated: vi.fn() }),
    );

    await act(async () => {
      await result.current.cancel();
    });

    expect(userDataModuleMock.deleteUserData).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("success");
  });
});