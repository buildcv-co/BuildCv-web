import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportErrorPanel } from "./export-error-panel";
import { copy } from "@/lib/copy/es";
import { ExportError } from "@/lib/api/export";

function makeError(
  status: number,
  kind: ExportError["kind"],
  message: string,
  code = "X",
): ExportError {
  return new ExportError({ status, code, kind, message });
}

describe("ExportErrorPanel — ramas de error", () => {
  it("422 invention: muestra mensaje del backend + botón 'Regenerar' (onRegenerate)", async () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(422, "invention", "Se detectó [FakeCorp].");
    const user = userEvent.setup();
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText("Se detectó [FakeCorp].")).toBeInTheDocument();
    const regen = screen.getByRole("button", { name: /regenerar/i });
    expect(regen).toBeInTheDocument();
    await user.click(regen);
    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("429 rate_limit: muestra mensaje honesto, SIN botón retry (Constitution Art. VII)", () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(429, "rate_limit", copy.export.errors.rateLimit);
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText(copy.export.errors.rateLimit)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerar/i })).not.toBeInTheDocument();
  });

  it("503 unavailable: muestra mensaje + botón 'Reintentar' (onRetry)", async () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(503, "unavailable", copy.export.errors.unavailable);
    const user = userEvent.setup();
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText(copy.export.errors.unavailable)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /reintentar/i });
    expect(retry).toBeInTheDocument();
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRegenerate).not.toHaveBeenCalled();
  });

  it("0/network: muestra mensaje genérico, SIN botones de acción", () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(0, "network", copy.export.errors.network);
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText(copy.export.errors.network)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerar/i })).not.toBeInTheDocument();
  });

  it("400 validation: muestra mensaje genérico honesto", () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(400, "validation", "Revisa los datos…");
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText("Revisa los datos…")).toBeInTheDocument();
  });

  it("500 unknown: muestra mensaje del backend tal cual", () => {
    const onRegenerate = vi.fn();
    const onRetry = vi.fn();
    const err = makeError(500, "unknown", "Algo se rompió.");
    render(
      <ExportErrorPanel error={err} onRegenerate={onRegenerate} onRetry={onRetry} />,
    );
    expect(screen.getByText("Algo se rompió.")).toBeInTheDocument();
  });
});

describe("ExportErrorPanel — accesibilidad", () => {
  it("role='alert' y aria-live='assertive' para que screen readers anuncien", () => {
    const err = makeError(422, "invention", "msg");
    render(
      <ExportErrorPanel error={err} onRegenerate={vi.fn()} onRetry={vi.fn()} />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
