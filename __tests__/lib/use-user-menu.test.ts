import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * Tests de `lib/use-user-menu.ts` (009-auth-web PR7 — T-PR7-001).
 *
 * Hook client-side que envuelve `getSession()` de `@/lib/api/session` y
 * expone el estado de auth para que `<UserMenu>` lo consuma. Tres
 * estados observables (REQ-FN-017):
 *   - `loading`  → mientras `getSession()` está en vuelo (initial render).
 *   - `authenticated` → `getSession()` resolvió con `{user, expiresAt}`.
 *   - `unauthenticated` → `getSession()` resolvió con `null` (401) o lanzó error.
 *
 * Decisiones:
 *  - **Sin `useSession` de next-auth/react**: el proyecto usa `getSession()`
 *    contra el BFF same-origin `/api/auth/session` (Constitution Art. VI —
 *    el browser NUNCA habla directo con el backend).
 *  - **NO expone `expiresAt` ni `id`** al consumidor del hook: el menú no
 *    los necesita. Mantenerlos fuera reduce superficie de leak (Art. III).
 *  - **Errores de red/5xx**: cualquier error se traduce a `unauthenticated`
 *    (no crash, no flicker — Art. VII).
 */

const sessionMock = {
  getSession: vi.fn(),
};

vi.mock("@/lib/api/session", () => sessionMock);

beforeEach(() => {
  vi.resetModules();
  sessionMock.getSession.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loadHook() {
  return await import("@/lib/use-user-menu");
}

const AUTH_PAYLOAD = {
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "ada@example.com",
    name: "Ada Lovelace",
  },
  expiresAt: "2026-06-26T22:00:00Z",
};

describe("useUserMenu (hook, PR7 T-PR7-001)", () => {
  it("devuelve status='loading' en el initial render antes de que getSession() resuelva", async () => {
    // Mock que nunca resuelve — captura el estado sincrónico del primer render.
    sessionMock.getSession.mockImplementation(
      () => new Promise(() => {}),
    );

    const { useUserMenu } = await loadHook();
    const { result } = renderHook(() => useUserMenu());

    // Estado sincrónico, sin esperar microtasks.
    expect(result.current).toMatchObject({ status: "loading", user: null });
  });

  it("devuelve status='authenticated' con user cuando getSession() resuelve con payload", async () => {
    sessionMock.getSession.mockResolvedValue(AUTH_PAYLOAD);

    const { useUserMenu } = await loadHook();
    const { result } = renderHook(() => useUserMenu());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "authenticated",
        user: {
          email: "ada@example.com",
          name: "Ada Lovelace",
        },
      });
    });

    // NO expone `expiresAt` ni `id` (PII / superficie mínima Art. III).
    const state = result.current as {
      user?: { id?: unknown; expiresAt?: unknown };
    };
    expect(state.user).not.toHaveProperty("id");
    expect(state.user).not.toHaveProperty("expiresAt");
  });

  it("devuelve status='unauthenticated' cuando getSession() resuelve con null (401)", async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const { useUserMenu } = await loadHook();
    const { result } = renderHook(() => useUserMenu());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "unauthenticated",
        user: null,
      });
    });
  });

  it("devuelve status='unauthenticated' cuando getSession() lanza error (controlled failure, no crash)", async () => {
    // Errores 5xx o de red NO deben crashear el componente (Art. VII).
    sessionMock.getSession.mockRejectedValue(
      new Error("Session expired (status=502): BFF 502"),
    );

    const { useUserMenu } = await loadHook();
    const { result } = renderHook(() => useUserMenu());

    await waitFor(() => {
      expect(result.current).toMatchObject({
        status: "unauthenticated",
        user: null,
      });
    });
  });

  it("llama getSession exactamente una vez en mount (sin polling)", async () => {
    sessionMock.getSession.mockResolvedValue(AUTH_PAYLOAD);

    const { useUserMenu } = await loadHook();
    renderHook(() => useUserMenu());

    await waitFor(() => {
      expect(sessionMock.getSession).toHaveBeenCalledTimes(1);
    });
  });
});
