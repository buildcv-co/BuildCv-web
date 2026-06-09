import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdaptPanel } from "./adapt-panel";
import type { AdaptationResult, EntityInvention, ValidationReport } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

function successResult(severity: "None" | "Warning" | "Critical" = "None"): AdaptationResult {
  const inventions: EntityInvention[] =
    severity === "Critical"
      ? [
          {
            type: "Company",
            claimed: "FakeCorp",
            original: null,
            severity: "Hard",
            position: 10,
          },
        ]
      : severity === "Warning"
        ? [
            {
              type: "Skill",
              claimed: "MongoDB",
              original: null,
              severity: "Soft",
              position: 5,
            },
          ]
        : [];
  const validation: ValidationReport = {
    isValid: severity !== "Critical",
    severity,
    inventions,
    warnings: [],
  };
  return {
    adaptedCv: "# CV adaptado\n- AWS",
    validation,
    engineVersion: "1.0.0",
    aiModel: "stub",
  };
}

const CV = "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.";
const JOB = "Buscamos backend .NET con AWS.";

function fetchMock(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn().mockImplementation((url: string) => impl(url));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdaptPanel — estado inicial", () => {
  it("muestra el panel con botón honesto (no claims de IA que el stub no cumple)", () => {
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    expect(
      screen.getByRole("button", { name: copy.adapt.panel.button }),
    ).toBeInTheDocument();
    // El hint 'versión determinista · v0' debe ser visible (Constitution Art. IV honest copy)
    expect(screen.getByText(copy.adapt.panel.buttonHint)).toBeInTheDocument();
  });

  it("el botón NO dice 'con IA' (en v0 el stub es determinista, no LLM)", () => {
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    expect(
      screen.queryByRole("button", { name: /adaptar con ia/i }),
    ).not.toBeInTheDocument();
  });

  it("muestra el título y la descripción del panel", () => {
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    expect(screen.getByText(copy.adapt.panel.title)).toBeInTheDocument();
    expect(screen.getByText(copy.adapt.panel.description)).toBeInTheDocument();
  });
});

describe("AdaptPanel — botón deshabilitado sin inputs", () => {
  it("cvText vacío → botón disabled", () => {
    render(<AdaptPanel cvText="" jobText={JOB} />);
    const btn = screen.getByRole("button", { name: copy.adapt.panel.button });
    expect(btn).toBeDisabled();
  });

  it("jobText vacío → botón disabled", () => {
    render(<AdaptPanel cvText={CV} jobText="" />);
    const btn = screen.getByRole("button", { name: copy.adapt.panel.button });
    expect(btn).toBeDisabled();
  });

  it("ambos vacíos → botón disabled", () => {
    render(<AdaptPanel cvText="" jobText="" />);
    const btn = screen.getByRole("button", { name: copy.adapt.panel.button });
    expect(btn).toBeDisabled();
  });
});

describe("AdaptPanel — happy path", () => {
  it("click → loading (aria-busy, buttonLoading) → success renderiza componentes hijos", async () => {
    const user = userEvent.setup();
    fetchMock((url) => {
      if (url === "/api/adapt") return Promise.resolve(jsonResponse(successResult("None")));
      return Promise.resolve(textResponse("not used", 500));
    });

    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    const btn = screen.getByRole("button", { name: copy.adapt.panel.button });
    await user.click(btn);

    // Después de resolver el fetch, debe mostrar severity-badge, adapted-cv-viewer, delta-improvements
    await waitFor(() => {
      expect(screen.getByText(/sin invenciones/i)).toBeInTheDocument();
    });
    // El adaptedCvViewer ahora usa markup semántico: el "# CV adaptado" se renderiza como
    // <h2>CV adaptado</h2> (el "#" se elimina porque es el markdown del heading).
    expect(screen.getByRole("heading", { level: 2, name: "CV adaptado" })).toBeInTheDocument();
    expect(screen.getByText(/cambios aplicados/i)).toBeInTheDocument();
  });

  it("envía POST /api/adapt con cvText/jobText en el body", async () => {
    const user = userEvent.setup();
    let captured: { url: string; body: unknown } | undefined;
    fetchMock((url) => {
      if (url === "/api/adapt") {
        // Capturamos el body en la siguiente microtask
        return Promise.resolve(jsonResponse(successResult("None"))).then((r) => {
          // El mock fetch se llama con (url, init) — capturamos desde el spy
          return r;
        });
      }
      return Promise.resolve(textResponse("nope", 500));
    });
    // El spy global stub nos da acceso a las llamadas
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(successResult("None")));
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/api/adapt");
    expect(calledInit.method).toBe("POST");
    const body = JSON.parse(calledInit.body as string);
    expect(body).toEqual({ cvText: CV, jobText: JOB });
    void captured;
  });
});

describe("AdaptPanel — errores", () => {
  it("network: muestra mensaje 'revisá tu conexión' (copy.adapt.errors.network)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.adapt.errors.network)).toBeInTheDocument();
    });
  });

  it("422 invention: muestra mensaje del backend + botón Regenerar", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(
        jsonResponse(
          { title: "HardInvention", detail: "Se detectó [FakeCorp] que no existe." },
          422,
        ),
      ),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/FakeCorp/)).toBeInTheDocument();
    });
    const regen = screen.getByRole("button", { name: copy.adapt.cta.regenerate });
    expect(regen).toBeInTheDocument();
  });

  it("422: click Regenerar llama requestAdapt de nuevo", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          { title: "HardInvention", detail: "Se detectó [FakeCorp]." },
          422,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(successResult("None")));
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: copy.adapt.cta.regenerate })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: copy.adapt.cta.regenerate }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  it("429 rate_limit: muestra mensaje honesto SIN botón Regenerar", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(jsonResponse({ title: "RateLimited", detail: "5/h" }, 429)),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.adapt.errors.rateLimit)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: copy.adapt.cta.regenerate }),
    ).not.toBeInTheDocument();
  });

  it("503 unavailable: muestra mensaje 'no está disponible temporalmente'", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(jsonResponse({ title: "AiOffline", detail: "down" }, 503)),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(copy.adapt.errors.unavailable)).toBeInTheDocument();
    });
  });

  it("400 validation: muestra mensaje honesto de validación", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(
        jsonResponse(
          { title: "Validation", errors: { cvText: ["muy corto"] } },
          400,
        ),
      ),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/revisa|texto/i)).toBeInTheDocument();
    });
  });

  it("500 unknown: muestra mensaje del backend (problem.detail) o fallback", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(jsonResponse({ title: "Boom", detail: "Algo se rompió" }, 500)),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/Algo se rompió/)).toBeInTheDocument();
    });
  });
});

describe("AdaptPanel — loading state visible", () => {
  it("durante el fetch: aria-busy y label cambia a buttonLoading", async () => {
    let resolveFn: (r: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => {
      resolveFn = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValueOnce(pending),
    );
    const user = userEvent.setup();
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    const btn = screen.getByRole("button", { name: copy.adapt.panel.button });
    await user.click(btn);
    // Loading activo
    await waitFor(() => {
      const loadingBtn = screen.getByRole("button", { name: copy.adapt.panel.buttonLoading });
      expect(loadingBtn).toHaveAttribute("aria-busy", "true");
      expect(loadingBtn).toBeDisabled();
    });
    // Resolvemos para no dejar promesa pendiente
    resolveFn(jsonResponse(successResult("None")));
  });
});

describe("AdaptPanel — edge case happy + empty inventions (None)", () => {
  it("estado success con None severity: no muestra sección de 'Cambios aplicados' detallada", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("None"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/sin invenciones/i)).toBeInTheDocument();
    });
    // delta-improvements: el componente sigue presente (título 'Cambios aplicados') pero con copy vacío
    const deltaSection = screen.getByRole("region", { name: /cambios aplicados/i });
    expect(within(deltaSection).getByText(copy.adapt.delta.empty)).toBeInTheDocument();
  });
});

describe("AdaptPanel — integración con ExportButton (sprint 2)", () => {
  it("estado success renderiza el botón 'Descargar PDF' de ExportButton", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("None"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/sin invenciones/i)).toBeInTheDocument();
    });
    // El botón de export (de ExportButton) debe estar presente en success
    expect(
      screen.getByRole("button", { name: copy.export.button }),
    ).toBeInTheDocument();
  });

  it("estado success también renderiza el filename-hint", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("None"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByTestId("filename-hint")).toBeInTheDocument();
    });
    expect(screen.getByTestId("filename-hint").textContent).toMatch(
      /^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  });

  it("estado idle (sin click) NO renderiza el botón de export", () => {
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    expect(
      screen.queryByRole("button", { name: copy.export.button }),
    ).not.toBeInTheDocument();
  });

  it("estado error NO renderiza el botón de export (solo el error panel)", async () => {
    const user = userEvent.setup();
    fetchMock(() =>
      Promise.resolve(
        jsonResponse(
          { title: "Boom", detail: "Algo se rompió" },
          500,
        ),
      ),
    );
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/Algo se rompió/)).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: copy.export.button }),
    ).not.toBeInTheDocument();
  });
});

describe("AdaptPanel — gate de export por Hard inventions (Constitution Art. I)", () => {
  it("success con severity=Critical + Hard inventions: NO renderiza Descargar PDF, SÍ muestra Regenerar", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("Critical"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    // Espera al severity badge de Critical
    await waitFor(() => {
      expect(screen.getByText(/Cr[ií]tica|Atenci[oó]n/i)).toBeInTheDocument();
    });
    // El botón de export NO debe estar presente
    expect(
      screen.queryByRole("button", { name: copy.export.button }),
    ).not.toBeInTheDocument();
    // El panel explicativo con Regenerar SÍ debe estar
    expect(
      screen.getByRole("button", { name: copy.adapt.exportGate.regenerate }),
    ).toBeInTheDocument();
  });

  it("success con severity=Critical: muestra mensaje claro de por qué no se puede exportar", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("Critical"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/Cr[ií]tica|Atenci[oó]n/i)).toBeInTheDocument();
    });
    // Mensaje: no se puede exportar porque hay Hard inventions
    expect(
      screen.getByText(/no se puede exportar|invenciones|no est[áa] en el original|regenera/i),
    ).toBeInTheDocument();
  });

  it("success con severity=Warning (solo Soft inventions): SÍ renderiza Descargar PDF (gate permite)", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("Warning"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/advertencia/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: copy.export.button }),
    ).toBeInTheDocument();
  });

  it("success con severity=None: SÍ renderiza Descargar PDF", async () => {
    const user = userEvent.setup();
    fetchMock(() => Promise.resolve(jsonResponse(successResult("None"))));
    render(<AdaptPanel cvText={CV} jobText={JOB} />);
    await user.click(screen.getByRole("button", { name: copy.adapt.panel.button }));
    await waitFor(() => {
      expect(screen.getByText(/sin invenciones/i)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: copy.export.button }),
    ).toBeInTheDocument();
  });
});
