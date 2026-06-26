import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportButton } from "./import-button";
import type { ImportResult, ImportResultV2 } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  const blob = new Blob(["x".repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const successResult: ImportResult = {
  text: "Juan Pérez\nBackend Developer con experiencia en C# y .NET.",
  sections: [
    { heading: "EXPERIENCIA", start: 27, end: 50, confidence: "High" },
  ],
  warnings: [],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000001",
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ImportButton — estado inicial", () => {
  it("muestra el FileUpload cuando no hay archivo seleccionado", () => {
    render(<ImportButton />);
    expect(
      screen.getByTestId("file-upload-dropzone"),
    ).toBeInTheDocument();
  });

  it("NO muestra el ImportResultPanel ni el ImportErrorPanel en idle", () => {
    render(<ImportButton />);
    expect(screen.queryByTestId("import-result-text")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ImportButton — happy path (idle → loading → success)", () => {
  it("selecciona archivo → success muestra ImportResultPanel con el texto", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResult)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("cv.pdf", "application/pdf");
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId("import-result-text")).toBeInTheDocument();
    });
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.import.states.success }),
    ).toBeInTheDocument();
  });

  it("llama POST a /api/import con FormData que contiene el file (BFF same-origin)", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(successResult));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("cv.pdf", "application/pdf");
    await user.upload(input, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/import");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    const formData = init.body as FormData;
    expect(formData.get("file")).toBe(file);
  });

  it("success: muestra el botón 'Analizar este CV ahora' y guarda el texto en localStorage", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResult)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.import.buttonAnalyze }),
      ).toBeInTheDocument();
    });
  });
});

describe("ImportButton — manejo de errores", () => {
  it("422 validation: muestra ImportErrorPanel con mensaje del backend", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "PDF escaneado",
            status: 422,
            detail:
              "Este PDF parece un escaneo. No podemos extraer texto. Pega el contenido manualmente o usa un PDF con texto seleccionable.",
            code: "IMPORT_SCANNED_PDF",
          },
          422,
        ),
      ),
    );
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("scan.pdf", "application/pdf"));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(within(alert).getByText(/escaneo/)).toBeInTheDocument();
    });
  });

  it("415 unsupported_mime: muestra mensaje 'PDF o DOCX'", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Tipo no soportado",
            status: 415,
            detail: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
            code: "IMPORT_UNSUPPORTED_MEDIA",
          },
          415,
        ),
      ),
    );
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("fake.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
    });
  });

  it("429 rate_limit: muestra mensaje '30/hora' honesto", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Rate limited",
            status: 429,
            detail: "Has alcanzado el tope de importaciones (30/hora).",
            code: "IMPORT_RATE_LIMIT_EXCEEDED",
          },
          429,
        ),
      ),
    );
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByText(copy.import.errors.rateLimit)).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("network error: muestra mensaje de red (revisá tu conexión)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByText(copy.import.errors.network)).toBeInTheDocument();
    });
  });
});

describe("ImportButton — estado loading", () => {
  it("durante el fetch: el FileUpload está disabled (aria-disabled='true')", async () => {
    let resolveFn: (r: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveFn = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending));
    const user = userEvent.setup();
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      const dropZone = screen.getByTestId("file-upload-dropzone");
      expect(dropZone).toHaveAttribute("aria-disabled", "true");
    });
    // Resolvemos para no dejar promesas pendientes
    resolveFn(jsonResponse(successResult));
  });
});

describe("ImportButton — reintentar tras error de motor (503)", () => {
  it("503 engine: muestra botón Reintentar; click llama requestImport de nuevo", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Motor de import no disponible",
            status: 503,
            detail: "down",
            code: "IMPORT_ENGINE_ERROR",
          },
          503,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(successResult));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByText(copy.import.errors.engine)).toBeInTheDocument();
    });
    const retry = screen.getByRole("button", { name: copy.export.retry });
    await user.click(retry);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe("ImportButton — reset tras éxito", () => {
  it("después del success, el ImportResultPanel sigue visible", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResult)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("import-result-text")).toBeInTheDocument();
    });

    // El resultado se preserva (no se borra automáticamente)
    expect(screen.getByTestId("import-result-text")).toBeInTheDocument();
  });
});

// =====================================================================
// 021-structured-cv-import-and-job-input — PR 2e: v2 path (ImportResultV2)
// =====================================================================

const successResultV2: ImportResultV2 = {
  cv: {
    basics: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      profiles: [],
      confidence: {
        name: "inferred",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
    meta: { engineVersion: "2.0.0" },
  },
  warnings: [
    { code: "IMAGE_OMITTED", message: "Se omitieron 2 imágenes.", severity: "Info" },
  ],
  engineVersion: "2.0.0",
  traceId: "0HMVD9F2E5Q2P:00000200",
};

describe("ImportButton — v2 path (PR 2e)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renderiza panel estructurado (NO muestra el <pre> con texto plano) cuando el backend devuelve ImportResultV2", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResultV2)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("import-result-structured")).toBeInTheDocument();
    });
    // En el camino v2 NO se renderiza el preview de texto plano heredado.
    expect(screen.queryByTestId("import-result-text")).not.toBeInTheDocument();
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
  });

  it("click en 'Analizar este CV' escribe el CvDocument serializado en localStorage (cv-preseed)", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResultV2)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.import.buttonAnalyze }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: copy.import.buttonAnalyze }));

    const preseed = window.localStorage.getItem("buildcv:analizar:cv-preseed");
    expect(preseed).not.toBeNull();
    expect(preseed).toContain("Ada Lovelace");
    expect(preseed).toContain("ada@example.com");

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("click en 'Analizar este CV' (v2) escribe el CvDocument estructurado en localStorage (cv-document) para el editor (PR 4)", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResultV2)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("import-result-structured")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: copy.import.buttonAnalyze }));

    const stored = window.localStorage.getItem("buildcv:editor:cv-document");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.basics.name).toBe("Ada Lovelace");
    expect(parsed.basics.email).toBe("ada@example.com");
    expect(parsed.meta.engineVersion).toBe("2.0.0");

    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("camino legacy (v1) NO escribe el CvDocument estructurado (preserva comportamiento original)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successResult)));
    const { container } = render(<ImportButton editorAvailable />);

    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    await user.upload(input, makeFile("cv.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.getByTestId("import-result-text")).toBeInTheDocument();
    });

    const stored = window.localStorage.getItem("buildcv:editor:cv-document");
    expect(stored).toBeNull();
  });
});
