import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  DevErrorOverlay,
  pushDevError,
  clearDevErrors,
  getDevErrors,
  __setDevOverlayEnvForTests,
} from "./dev-error-overlay";

const SAMPLE = {
  id: "err-1",
  timestamp: "2026-06-09T12:00:00.000Z",
  message: "Test error",
  stack: "at foo (file:1:1)",
  level: "error" as const,
};

describe("DevErrorOverlay", () => {
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;
  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearDevErrors();
    __setDevOverlayEnvForTests("development");
    consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writeTextSpy = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextSpy },
      writable: true,
    });
  });

  afterEach(() => {
    consoleErrSpy.mockRestore();
  });

  it("retorna null cuando process.env.NODE_ENV !== 'development'", () => {
    __setDevOverlayEnvForTests("production");
    const { container } = render(<DevErrorOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el panel en dev mode", () => {
    __setDevOverlayEnvForTests("development");
    render(<DevErrorOverlay />);
    expect(
      screen.getByText(/panel de errores en desarrollo/i),
    ).toBeInTheDocument();
  });

  it("muestra el disclaimer 'no se envían a terceros'", () => {
    render(<DevErrorOverlay />);
    expect(
      screen.getByText(/no se envían a terceros/i),
    ).toBeInTheDocument();
  });

  it("muestra emptyHint cuando no hay errores", () => {
    render(<DevErrorOverlay />);
    expect(screen.getByText(/sin errores todavía/i)).toBeInTheDocument();
  });

  it("muestra los errores que se pushearon via pushDevError", () => {
    pushDevError(SAMPLE);
    render(<DevErrorOverlay />);
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("FIFO: mantiene los últimos 20 errores (el 21ro descarta el más viejo)", () => {
    for (let i = 0; i < 21; i += 1) {
      pushDevError({ ...SAMPLE, id: `err-${i}`, message: `m${i}` });
    }
    expect(getDevErrors()).toHaveLength(20);
    expect(getDevErrors()[0]?.message).toBe("m1");
    expect(getDevErrors()[19]?.message).toBe("m20");
  });

  it("click 'Descartar panel' oculta el panel", () => {
    render(<DevErrorOverlay />);
    const dismiss = screen.getByRole("button", { name: /descartar/i });
    expect(dismiss).toBeInTheDocument();
    fireEvent.click(dismiss);
    // Después de dismiss, el panel se oculta (no hay heading)
    expect(
      screen.queryByText(/panel de errores en desarrollo/i),
    ).not.toBeInTheDocument();
  });

  it("click 'Copiar stack' copia el stack al clipboard", () => {
    pushDevError(SAMPLE);
    render(<DevErrorOverlay />);
    const copyBtn = screen.getByRole("button", { name: /copiar stack/i });
    fireEvent.click(copyBtn);
    expect(writeTextSpy).toHaveBeenCalledTimes(1);
    expect(writeTextSpy.mock.calls[0]?.[0]).toContain("at foo (file:1:1)");
  });

  it("tiene role='alert' y aria-live='polite'", () => {
    render(<DevErrorOverlay />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("tiene aria-label descriptivo", () => {
    render(<DevErrorOverlay />);
    const alert = screen.getByRole("alert");
    const label = alert.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label?.toLowerCase()).toContain("errores");
  });

  it("se suscribe a futuros pushes (después de mount)", () => {
    render(<DevErrorOverlay />);
    expect(screen.queryByText("late error")).not.toBeInTheDocument();
    act(() => {
      pushDevError({ ...SAMPLE, id: "late", message: "late error" });
    });
    expect(screen.getByText("late error")).toBeInTheDocument();
  });

  it("el panel persiste entre pushes múltiples (no se cierra)", () => {
    render(<DevErrorOverlay />);
    act(() => {
      pushDevError(SAMPLE);
      pushDevError({ ...SAMPLE, id: "2", message: "second" });
    });
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
