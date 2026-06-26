/**
 * Tests RED → GREEN de `<SectionBreakdown>` (PR 5c).
 *
 * Componente presentacional que renderiza el response v2 (`ScoreCvResponseV2`)
 * del backend (`perSection` + `redFlags`) en dos bloques:
 *
 *   1. **Barras por sección** — 5 secciones (experience / education / skills
 *      / certifications / contact) con label + barra visual 0–100 + valor
 *      numérico. Una sección con `value === null` (no medible) muestra "—";
 *      con `value === 0` muestra "Vacío"; con `value === 100` muestra
 *      "Completo".
 *
 *   2. **Lista de red flags** — cada red flag con badge de severidad
 *      (low / medium / high) color-coded. Severidad `high` recibe borde
 *      + ícono de advertencia (énfasis visual, accesibility via
 *      `role="alert"` o `aria-label` descriptivo). Si la lista está vacía,
 *      se muestra el empty state "No se detectaron señales".
 *
 * Acceptance criteria (espejo del spec `021/specs/score-section-breakdown/spec.md`):
 *  - Las 5 barras se renderizan SIEMPRE, incluso si algunas secciones
 *    vienen `null` (la UI debe comunicar "no medible", no ocultar).
 *  - Las barras cumplen a11y (`role="progressbar"` + `aria-valuenow`).
 *  - La lista de red flags tiene `role="list"` y cada item `role="listitem"`.
 *  - El empty state es semántico (`role="status"`).
 *
 *  1. Renders all 5 sections with 0–100 bars (a11y via `role="progressbar"`).
 *  2. Section with 0 → empty bar + copy "Vacío".
 *  3. Section with 100 → full bar + copy "Completo".
 *  4. RedFlags render with severity badge color-coded (semantic
 *     `data-severity` attribute).
 *  5. RedFlag severity high → red border + warning icon + descriptive
 *     aria-label.
 *  6. Empty redFlags → empty state copy.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SectionBreakdown } from "@/components/analyzer/section-breakdown";
import type { PerSectionScore, RedFlag } from "@/lib/api/types";

const FULL_SECTIONS: PerSectionScore = {
  experience: 85,
  education: 70,
  skills: 90,
  certifications: 50,
  contact: 60,
};

const SECTIONS_WITH_EXTREMES: PerSectionScore = {
  experience: 0,
  education: 100,
  skills: 85,
  certifications: null,
  contact: 60,
};

const FLAGS_LOW: RedFlag[] = [
  {
    code: "EMPLOYMENT_GAP_6MO",
    severity: "low",
    message: "Gap de 7 meses entre 2021-09 y 2022-04",
  },
];

const FLAGS_HIGH: RedFlag[] = [
  {
    code: "JOB_HOPPING",
    severity: "high",
    message: "4 empleadores en los últimos 5 años con tenure < 18 meses",
  },
];

const FLAGS_MIXED: RedFlag[] = [
  {
    code: "EMPLOYMENT_GAP_6MO",
    severity: "low",
    message: "Gap de 7 meses",
  },
  {
    code: "MISSING_LINKEDIN",
    severity: "medium",
    message: "Sin perfil de LinkedIn",
  },
  {
    code: "JOB_HOPPING",
    severity: "high",
    message: "4 empleadores en 5 años",
  },
];

describe("SectionBreakdown", () => {
  it("SectionBreakdown_Renders_All_5_Sections_With_0_To_100_Bars", () => {
    render(<SectionBreakdown perSection={FULL_SECTIONS} redFlags={[]} />);
    const sections = [
      "experience",
      "education",
      "skills",
      "certifications",
      "contact",
    ] as const;
    for (const key of sections) {
      const bar = screen.getByTestId(`section-bar-${key}`);
      expect(bar, `section-bar-${key} should render`).toBeInTheDocument();
      // a11y: la barra es un progressbar con valuenow entre 0 y 100.
      expect(bar).toHaveAttribute("role", "progressbar");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      const value = Number(bar.getAttribute("aria-valuenow"));
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it("SectionBreakdown_Section_With_0_Shows_Empty_Bar_With_NA_Copy", () => {
    render(
      <SectionBreakdown
        perSection={SECTIONS_WITH_EXTREMES}
        redFlags={[]}
      />,
    );
    const bar = screen.getByTestId("section-bar-experience");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    // El fill de la barra para score 0 debe tener width 0% (vacío visual).
    const fill = within(bar).getByTestId("section-bar-fill");
    expect(fill.style.width).toBe("0%");
    // Copy específico para valor 0 ("Vacío") ayuda a distinguir de
    // `null` ("Sin datos"). El usuario necesita saber que la sección
    // existe pero está completamente vacía. El copy vive en la fila
    // padre (`section-row-experience`) que envuelve label + estado + bar.
    const row = screen.getByTestId("section-row-experience");
    expect(within(row).getByText(/vac[ií]o/i)).toBeInTheDocument();
  });

  it("SectionBreakdown_Section_With_100_Shows_Full_Bar_With_High_Copy", () => {
    render(
      <SectionBreakdown
        perSection={SECTIONS_WITH_EXTREMES}
        redFlags={[]}
      />,
    );
    const bar = screen.getByTestId("section-bar-education");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    const fill = within(bar).getByTestId("section-bar-fill");
    expect(fill.style.width).toBe("100%");
    // Copy específico para valor 100 ("Completo") ayuda a distinguir
    // del puntaje numérico solo.
    const row = screen.getByTestId("section-row-education");
    expect(within(row).getByText(/completo/i)).toBeInTheDocument();
  });

  it("SectionBreakdown_Renders_RedFlags_With_Severity_Badge_Color_Coded", () => {
    render(
      <SectionBreakdown perSection={FULL_SECTIONS} redFlags={FLAGS_MIXED} />,
    );
    // La lista de red flags es semántica (`role="list"` con `listitem` por
    // item) para que screen readers la lean como una lista. Scoping al
    // section de flags porque la sección de barras también usa `<ul>`.
    const flagsSection = screen.getByTestId("section-breakdown-flags");
    const list = within(flagsSection).getByRole("list");
    expect(list).toBeInTheDocument();
    // Cada severidad tiene su badge con `data-severity` (semantic proxy
    // para el color — no asserteamos clases CSS, que serían coupling a
    // implementación).
    for (const flag of FLAGS_MIXED) {
      const item = screen.getByTestId(`red-flag-${flag.code}`);
      expect(item, `red-flag-${flag.code} should render`).toBeInTheDocument();
      expect(item).toHaveAttribute("role", "listitem");
      const badge = within(item).getByTestId(
        `red-flag-severity-${flag.severity}`,
      );
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-severity", flag.severity);
    }
  });

  it("SectionBreakdown_RedFlag_Severity_High_Shows_Red_Border_And_Warning_Icon", () => {
    const { rerender } = render(
      <SectionBreakdown perSection={FULL_SECTIONS} redFlags={FLAGS_HIGH} />,
    );
    const flag = screen.getByTestId("red-flag-JOB_HOPPING");
    const badge = within(flag).getByTestId("red-flag-severity-high");
    expect(badge).toHaveAttribute("data-severity", "high");
    // El ícono de advertencia aparece SOLO para severidad `high`
    // (la única que requiere atención inmediata del usuario).
    const warningIcon = within(badge).getByTestId("red-flag-warning-icon");
    expect(warningIcon).toBeInTheDocument();
    // El aria-label describe la urgencia para screen readers sin depender
    // del color (que es invisible para usuarios con daltonismo).
    expect(badge).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/alta|advertencia|atenci[oó]n/i),
    );
    // Severidades no-críticas NO muestran el ícono de advertencia (esto
    // triangula: el warning icon NO es genérico, solo aparece para high).
    rerender(
      <SectionBreakdown perSection={FULL_SECTIONS} redFlags={FLAGS_LOW} />,
    );
    const lowFlag = screen.getByTestId("red-flag-EMPLOYMENT_GAP_6MO");
    const lowBadge = within(lowFlag).getByTestId("red-flag-severity-low");
    expect(
      within(lowBadge).queryByTestId("red-flag-warning-icon"),
      "low severity should not show warning icon",
    ).not.toBeInTheDocument();
  });

  it("SectionBreakdown_Empty_RedFlags_Shows_No_RedFlags_Found_Copy", () => {
    const { rerender } = render(
      <SectionBreakdown perSection={FULL_SECTIONS} redFlags={[]} />,
    );
    // El empty state debe ser visible y semántico (`role="status"` para
    // que screen readers lo anuncien como información no urgente).
    const empty = screen.getByTestId("red-flag-empty");
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveAttribute("role", "status");
    // El copy comunica explícitamente que no se detectaron señales —
    // refuerza la honestidad del producto (Constitution Art. IV).
    expect(empty.textContent).toMatch(/no (se detectaron|hay) se[ñn]ales/i);
    // Cuando hay red flags, el empty state NO debe renderizarse (el
    // listado toma su lugar). Re-renderizamos para simular el flujo
    // del analyzer cambiando de response vacío a response con señales.
    rerender(
      <SectionBreakdown perSection={FULL_SECTIONS} redFlags={FLAGS_LOW} />,
    );
    expect(screen.queryByTestId("red-flag-empty")).not.toBeInTheDocument();
    // Y el listado de flags SÍ debe estar presente (triangulación: el
    // rerender realmente cambió el árbol, no es un no-op silencioso).
    expect(screen.getByTestId("red-flag-EMPLOYMENT_GAP_6MO")).toBeInTheDocument();
  });
});
