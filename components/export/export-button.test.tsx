import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "./export-button";
import { ExportError } from "@/lib/api/export";
import { copy } from "@/lib/copy/es";
import type { ExportRequest, ValidationReport } from "@/lib/api/types";

const validValidation: ValidationReport = {
  isValid: true,
  severity: "None",
  inventions: [],
  warnings: [],
};

const baseReq: ExportRequest = {
  adaptedCv: "# CV\n- C#",
  validation: validValidation,
  candidateName: "Candidato",
};

function pdfBlobResponse(): Response {
  return new Response(new Blob(["%PDF-1.4 mock"], { type: "application/pdf" }), {
    status: 200,
    headers: { "content-type": "application/pdf" },
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ExportButton — estado inicial", () => {
  it("muestra el botón con label 'Descargar PDF' (idle)", () => {
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    expect(
      screen.getByRole("button", { name: copy.export.button }),
    ).toBeInTheDocument();
  });

  it("muestra el filename-hint con la fecha actual", () => {
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    // La fecha actual — verificamos el patrón, no el día exacto
    expect(screen.getByTestId("filename-hint")).toBeInTheDocument();
    expect(screen.getByTestId("filename-hint").textContent).toMatch(
      /^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });
});

describe("ExportButton — happy path (click → loading → success → download)", () => {
  it("click → loading (aria-busy, buttonLoading) → success llama downloadBlob con filename correcto", async () => {
    const downloadBlobSpy = vi
      .spyOn(await import("@/lib/api/export"), "downloadBlob")
      .mockImplementation(() => undefined);

    // fetch pendiente para observar el estado loading
    let resolveFn: (r: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveFn = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending));

    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );

    await user.click(screen.getByRole("button", { name: copy.export.button }));

    // Loading visible
    await waitFor(() => {
      const loadingBtn = screen.getByRole("button", {
        name: copy.export.buttonLoading,
      });
      expect(loadingBtn).toHaveAttribute("aria-busy", "true");
      expect(loadingBtn).toBeDisabled();
    });

    // Resolvemos el fetch
    resolveFn(pdfBlobResponse());

    // Después de resolver el fetch, downloadBlob se llamó
    await waitFor(() => {
      expect(downloadBlobSpy).toHaveBeenCalledTimes(1);
    });
    const [blobArg, filenameArg] = downloadBlobSpy.mock.calls[0] as [Blob, string];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe("application/pdf");
    expect(filenameArg).toMatch(/^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/);

    // Estado success: muestra feedback
    await waitFor(() => {
      expect(screen.getByText(copy.export.success)).toBeInTheDocument();
    });
  });
});

describe("ExportButton — 422 invention → ExportErrorPanel con onRegenerate", () => {
  it("muestra panel de error con botón Regenerar que llama onRegenerate", async () => {
    const onRegenerate = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          { title: "HardInvention", detail: "Se detectó [FakeCorp]." },
          422,
        ),
      ),
    );
    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={onRegenerate}

      />,
    );
    await user.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => {
      expect(screen.getByText(/FakeCorp/)).toBeInTheDocument();
    });
    const regen = screen.getByRole("button", { name: /regenerar/i });
    expect(regen).toBeInTheDocument();
    await user.click(regen);
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });
});

describe("ExportButton — 429 rate_limit → panel SIN botón retry", () => {
  it("muestra mensaje honesto de rate limit sin botones de acción", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({ title: "RateLimited", detail: "20/h reached" }, 429),
      ),
    );
    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    await user.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.export.errors.rateLimit)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerar/i })).not.toBeInTheDocument();
  });
});

describe("ExportButton — 503 unavailable → panel CON botón Reintentar", () => {
  it("muestra mensaje + botón Reintentar que dispara nueva petición", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ title: "PdfOffline", detail: "down" }, 503),
      )
      .mockResolvedValueOnce(pdfBlobResponse());
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(await import("@/lib/api/export"), "downloadBlob").mockImplementation(
      () => undefined,
    );

    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    await user.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.export.errors.unavailable)).toBeInTheDocument();
    });
    const retry = screen.getByRole("button", { name: /reintentar/i });
    await user.click(retry);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe("ExportButton — network error → mensaje genérico", () => {
  it("fetch rechaza → muestra copy.export.errors.network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    await user.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.export.errors.network)).toBeInTheDocument();
    });
  });
});

describe("ExportButton — prop disabled externa", () => {
  it("disabled=true: botón deshabilitado, no se llama fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

        disabled
      />,
    );
    const btn = screen.getByRole("button", { name: copy.export.button });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ExportButton — verifica que requestExportPdf se llama con args correctos", () => {
  it("pasa request exactamente al fetch via requestExportPdf (URL = /api/export)", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(pdfBlobResponse());
    vi.stubGlobal("fetch", fetchSpy);
    vi.spyOn(await import("@/lib/api/export"), "downloadBlob").mockImplementation(
      () => undefined,
    );

    const user = userEvent.setup();
    render(
      <ExportButton
        request={baseReq}
        onRegenerate={vi.fn()}

      />,
    );
    await user.click(screen.getByRole("button", { name: copy.export.button }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/export");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(baseReq);
  });
});

// Sanity: ExportError sigue siendo una clase
describe("ExportError import sanity", () => {
  it("ExportError existe y es clase", () => {
    const e = new ExportError({
      status: 0,
      code: "X",
      kind: "network",
      message: "m",
    });
    expect(e).toBeInstanceOf(ExportError);
    expect(e.name).toBe("ExportError");
  });
});
