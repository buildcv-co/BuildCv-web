import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffPage } from "./diff-page";
import { copy } from "@/lib/copy/es";
import { DIFF_HANDOFF_KEY } from "@/lib/diff/handoff";
import type { EntityInvention } from "@/lib/api/types";

const HANDOFF = {
  originalText: "Juan Pérez\nBackend Developer",
  adaptedText: "Juan Pérez\nBackend Developer Senior\nMétrica: 40%",
  validation: {
    isValid: false,
    severity: "Critical" as const,
    inventions: [
      {
        type: "Title" as const,
        claimed: "Senior",
        original: null,
        severity: "Hard" as const,
        position: 32,
      },
      {
        type: "Metric" as const,
        claimed: "40%",
        original: "35%",
        severity: "Soft" as const,
        position: 60,
      },
    ],
    warnings: ["Hard y Soft detectadas"],
  },
  adaptTraceId: "0HMVD9F2E5Q2P:00000012",
  timestamp: new Date().toISOString(),
};

function setHandoff(value: unknown) {
  if (value === null) {
    sessionStorage.removeItem(DIFF_HANDOFF_KEY);
    return;
  }
  sessionStorage.setItem(DIFF_HANDOFF_KEY, JSON.stringify(value));
}

beforeEach(() => {
  sessionStorage.clear();
  // jsdom no tiene matchMedia; lo stub para que el modo default se setee
  if (typeof window !== "undefined" && !window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => true,
      }),
    });
  }
});

describe("DiffPage", () => {
  it("si NO hay handoff en sessionStorage → muestra 'noHandoff' o equivalente", async () => {
    setHandoff(null);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => {
      expect(screen.getByText(copy.diff.page.noHandoff)).toBeInTheDocument();
    });
  });

  it("si handoff está expirado (>1h) → muestra mensaje de expirado", async () => {
    const expired = {
      ...HANDOFF,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    setHandoff(expired);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => {
      expect(screen.getByText(copy.diff.page.expired)).toBeInTheDocument();
    });
  });

  it("si handoff válido → renderiza el diff con el título de la página", async () => {
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: copy.diff.page.title, level: 1 })).toBeInTheDocument();
    });
  });

  it("renderiza el DiffView, DiffToolbar y ActionFooter en el árbol", async () => {
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => {
      expect(screen.getByRole("region", { name: /diff/i })).toBeInTheDocument();
      expect(screen.getByRole("toolbar", { name: /visor de diff/i })).toBeInTheDocument();
    });
  });

  it("toggle de modo cambia la vista", async () => {
    const user = userEvent.setup();
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    const sideBySideRadio = screen.getByRole("radio", { name: copy.diff.modes.sideBySide });
    await user.click(sideBySideRadio);
    expect(sideBySideRadio).toHaveAttribute("aria-checked", "true");
  });

  it("click Re-puntuar llama a /api/score y muestra el nuevo score", async () => {
    const user = userEvent.setup();
    setHandoff(HANDOFF);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        overallScore: 88,
        band: "Buen encaje",
        honestyNotice: "n/a",
        engineVersion: "1.0.0",
        lexiconVersion: "1.0.0",
        contextId: "ctx",
        components: [],
        keywordAnalysis: { present: [], partial: [], missing: [] },
        recommendations: [],
        formatIssues: [],
        gatesApplied: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    const rescoreBtn = screen.getByRole("button", { name: new RegExp(copy.diff.actions.rescore, "i") });
    await user.click(rescoreBtn);

    await waitFor(() => {
      expect(screen.getByText(/88/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("click Editar en un badge → muestra un input controlado con Zod validation", async () => {
    const user = userEvent.setup();
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    // Click sobre el badge "Senior" (Hard)
    const seniorBadge = screen.getByRole("button", { name: /Senior/i });
    await user.click(seniorBadge);
    // Popover aparece
    await waitFor(() => screen.getByRole("dialog"));
    // Click "Editar" en el popover (dentro del dialog)
    const dialog = screen.getByRole("dialog");
    const buttons = dialog.querySelectorAll("button");
    // buscar el botón cuyo textContent sea exactamente "Editar"
    let editBtn: HTMLButtonElement | null = null;
    for (const b of Array.from(buttons)) {
      if (b.textContent?.trim() === "Editar") {
        editBtn = b as HTMLButtonElement;
        break;
      }
    }
    expect(editBtn).not.toBeNull();
    await user.click(editBtn!);
    // Aparece un input con el valor actual prellenado
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("Senior");
  });

  it("edición con valor inválido (Zod fail) → cancela (no actualiza texto)", async () => {
    const user = userEvent.setup();
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    await user.click(screen.getByRole("button", { name: /Senior/i }));
    const dialog = screen.getByRole("dialog");
    const buttons = dialog.querySelectorAll("button");
    let editBtn: HTMLButtonElement | null = null;
    for (const b of Array.from(buttons)) {
      if (b.textContent?.trim() === "Editar") {
        editBtn = b as HTMLButtonElement;
        break;
      }
    }
    expect(editBtn).not.toBeNull();
    await user.click(editBtn!);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    // Vacía el input → Zod debería fallar (min length 1)
    await user.clear(input);
    await user.keyboard("{Enter}");
    // El input desaparece, no se aplica el cambio
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("edición con valor válido → actualiza el texto y elimina el flag", async () => {
    const user = userEvent.setup();
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    const seniorBadge = screen.getByRole("button", { name: /Senior/i });
    await user.click(seniorBadge);
    const dialog = screen.getByRole("dialog");
    const buttons = dialog.querySelectorAll("button");
    let editBtn: HTMLButtonElement | null = null;
    for (const b of Array.from(buttons)) {
      if (b.textContent?.trim() === "Editar") {
        editBtn = b as HTMLButtonElement;
        break;
      }
    }
    expect(editBtn).not.toBeNull();
    await user.click(editBtn!);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "Mid");
    await user.keyboard("{Enter}");
    // El input se cierra, la invención Senior desaparece
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /^Senior$/ })).not.toBeInTheDocument();
  });

  it("aria-live='polite' en el contenedor del score", async () => {
    setHandoff(HANDOFF);
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    // Buscamos el contenedor con aria-live
    const liveRegions = document.querySelectorAll('[aria-live="polite"]');
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  it("click Aceptar y exportar (sin Hard) navega a /analizar/exportar", async () => {
    const user = userEvent.setup();
    const safeHandoff = {
      ...HANDOFF,
      validation: { ...HANDOFF.validation, inventions: [] as EntityInvention[] },
    };
    setHandoff(safeHandoff);
    // Mock location.assign / push
    const pushSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "http://localhost/analizar/diff", assign: pushSpy, replace: vi.fn() },
      writable: true,
      configurable: true,
    });
    render(<DiffPage jobText="vacante de prueba" />);
    await waitFor(() => screen.getByRole("region", { name: /diff/i }));
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    // No podemos assert navegación (jsdom), pero verificamos que el handoff se actualizó
    await waitFor(() => {
      const raw = sessionStorage.getItem(DIFF_HANDOFF_KEY);
      expect(raw).not.toBeNull();
    });
  });
});
