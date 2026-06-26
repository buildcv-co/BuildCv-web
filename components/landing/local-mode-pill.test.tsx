import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/auth", () => ({
  IS_LOCAL: true,
}));

import { LocalModePill } from "./local-mode-pill";

const authMock = vi.hoisted(() => ({ IS_LOCAL: true }));
vi.mock("@/lib/auth", () => authMock);

beforeEach(() => {
  authMock.IS_LOCAL = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LocalModePill", () => {
  it("renderiza null cuando IS_LOCAL es false", async () => {
    authMock.IS_LOCAL = false;
    const { rerender } = render(<LocalModePill />);
    rerender(<LocalModePill />);
    expect(screen.queryByTestId("local-mode-pill")).toBeNull();
  });

  it("renderiza el badge con data-testid estable cuando IS_LOCAL es true", async () => {
    authMock.IS_LOCAL = true;
    const { rerender } = render(<LocalModePill />);
    rerender(<LocalModePill />);
    expect(screen.getByTestId("local-mode-pill")).toBeInTheDocument();
  });

  it("expone un accessible name derivado de copy.localModePill.description", async () => {
    authMock.IS_LOCAL = true;
    const { rerender } = render(<LocalModePill />);
    rerender(<LocalModePill />);
    const pill = screen.getByTestId("local-mode-pill");
    expect(pill).toHaveAccessibleName(/modo local activo/i);
  });

  it("marca role='status' para que los lectores de pantalla anuncien cambios (WCAG 4.1.3)", async () => {
    authMock.IS_LOCAL = true;
    const { rerender } = render(<LocalModePill />);
    rerender(<LocalModePill />);
    const pill = screen.getByTestId("local-mode-pill");
    expect(pill).toHaveAttribute("role", "status");
  });
});