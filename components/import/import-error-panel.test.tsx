import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportErrorPanel } from "./import-error-panel";
import { ImportError } from "@/lib/api/import";
import { copy } from "@/lib/copy/es";

function makeError(
  status: number,
  kind: ImportError["kind"],
  message: string,
  code = "X",
): ImportError {
  return new ImportError({ status, code, kind, message });
}

describe("ImportErrorPanel — accesibilidad", () => {
  it("renderiza con role='alert' para anuncio inmediato a screen readers (WCAG 2.2 AA)", () => {
    const err = makeError(415, "unsupported_mime", "msg");
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("ImportErrorPanel — mapeo por kind", () => {
  it("kind=network: muestra mensaje de red (no reintenta automáticamente, no tiene botón)", () => {
    const err = makeError(0, "network", copy.import.errors.network);
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText(copy.import.errors.network)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("kind=client_validation: muestra mensaje honesto de validación", () => {
    const err = makeError(0, "client_validation", copy.import.errors.clientValidation);
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText(copy.import.errors.clientValidation)).toBeInTheDocument();
  });

  it("kind=too_large: muestra mensaje '5 MB'", () => {
    const err = makeError(413, "too_large", copy.import.errors.tooLarge);
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText(copy.import.errors.tooLarge)).toBeInTheDocument();
    expect(screen.getByText(copy.import.errors.tooLarge)).toHaveTextContent("5 MB");
  });

  it("kind=unsupported_mime: muestra mensaje 'PDF o DOCX'", () => {
    const err = makeError(415, "unsupported_mime", copy.import.errors.unsupportedMime);
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
  });

  it("kind=validation + IMPORT_SCANNED_PDF: muestra mensaje detallado y CTA de pegar texto manualmente", async () => {
    const err = makeError(
      422,
      "validation",
      "PDF escaneado",
      "IMPORT_SCANNED_PDF",
    );
    const onManualFallback = vi.fn();
    const user = userEvent.setup();
    render(
      <ImportErrorPanel
        error={err}
        onRetry={vi.fn()}
        onManualFallback={onManualFallback}
      />,
    );
    expect(
      screen.getByText(copy.import.errors.scannedPdfDetailed),
    ).toBeInTheDocument();
    const cta = screen.getByRole("button", {
      name: copy.import.page.manualFallbackCta,
    });
    expect(cta).toBeInTheDocument();
    await user.click(cta);
    expect(onManualFallback).toHaveBeenCalledTimes(1);
  });

  it("kind=rate_limit: muestra mensaje '30/hora' honesto, SIN botón retry (Constitution Art. VII)", () => {
    const err = makeError(429, "rate_limit", copy.import.errors.rateLimit);
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText(copy.import.errors.rateLimit)).toBeInTheDocument();
    expect(screen.getByText(copy.import.errors.rateLimit)).toHaveTextContent("30/hora");
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("kind=engine: muestra mensaje 'no está disponible temporalmente' + botón Reintentar", async () => {
    const onRetry = vi.fn();
    const err = makeError(503, "engine", copy.import.errors.engine);
    const user = userEvent.setup();
    render(<ImportErrorPanel error={err} onRetry={onRetry} />);
    expect(screen.getByText(copy.import.errors.engine)).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: copy.export.retry });
    expect(retry).toBeInTheDocument();
    await user.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("kind=unknown: muestra el message del ImportError (viene del backend o fallback)", () => {
    const err = makeError(500, "unknown", "Algo se rompió en el backend");
    render(<ImportErrorPanel error={err} onRetry={vi.fn()} />);
    expect(screen.getByText("Algo se rompió en el backend")).toBeInTheDocument();
  });
});
