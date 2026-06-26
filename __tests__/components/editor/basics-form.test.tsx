/**
 * Tests RED → GREEN del componente `BasicsForm` (PR 4c).
 *
 * Cubre el shell de la sección basics del editor JSON Resume:
 *  1. Render con labels accesibles para todos los campos (WCAG 4.1.2).
 *  2. Controlled component — `onChange` se dispara al editar.
 *  3. Inline validation vía Zod — email inválido muestra mensaje.
 *  4. Conditional render — `datosPersonales` (subsección colombiana) solo
 *     visible cuando `datosPersonales.nacionalidad === "CO"`.
 *  5. Empty state — renderiza sin errores cuando `basics` está vacío.
 *  6. A11y keyboard — todos los fields son tab-focusable.
 *
 * El componente es presentacional + `onChange` (PR 4e lo monta en
 * `editor.tsx`). No promueve confianza — eso es PR 4d.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BasicsForm } from "@/components/editor/basics-form";
import type { Basics } from "@/lib/editor/types";

const CONFIDENCE = {
  name: "inferred",
  email: "inferred",
  phone: "inferred",
  location: "inferred",
  url: "inferred",
  profiles: "inferred",
  summary: "inferred",
  datosPersonales: "inferred",
} as const;

function makeBasics(overrides: Partial<Basics> = {}): Basics {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    url: "",
    profiles: [],
    summary: "",
    confidence: { ...CONFIDENCE },
    ...overrides,
  } as Basics;
}

describe("BasicsForm", () => {
  it("BasicsForm_Renders_All_Fields_With_Labels — cada input tiene su label accesible", () => {
    const onChange = vi.fn();
    render(<BasicsForm basics={makeBasics()} onChange={onChange} />);
    // Cada label debe estar asociado a un input por htmlFor.
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tel[eé]fono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ubicaci[oó]n|ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url|sitio web/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/resumen/i)).toBeInTheDocument();
  });

  it("BasicsForm_Calls_OnChange_When_Field_Edited — controlled component", () => {
    const onChange = vi.fn();
    render(<BasicsForm basics={makeBasics()} onChange={onChange} />);
    const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Ada Lovelace" } });
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Basics;
    expect(lastCall.name).toBe("Ada Lovelace");
  });

  it("BasicsForm_Shows_Validation_Error_For_Bad_Email — Zod inline validation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BasicsForm basics={makeBasics({ email: "no-es-email" })} onChange={onChange} />);
    const emailInput = screen.getByLabelText("Email", { selector: "input" }) as HTMLInputElement;
    // Dispara blur para que la validación inline corra.
    await user.click(emailInput);
    await user.tab();
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/email inv[aá]lido/i);
    });
  });

  it("BasicsForm_Shows_Colombian_DatosPersonales_When_Colombia_Selected — render condicional", () => {
    const onChange = vi.fn();
    const basics = makeBasics({
      datosPersonales: { nacionalidad: "CO" },
    });
    render(<BasicsForm basics={basics} onChange={onChange} />);
    // Cuando nacionalidad = CO, deben aparecer los campos colombianos.
    expect(screen.getByLabelText(/c[eé]dula/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/libreta militar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rh|grupo sangu[ií]neo/i)).toBeInTheDocument();
  });

  it("BasicsForm_Renders_With_Empty_Initial_Data — graceful empty state", () => {
    const onChange = vi.fn();
    const { container } = render(
      <BasicsForm basics={makeBasics()} onChange={onChange} />,
    );
    // El form existe y es accesible.
    const region = container.querySelector("[aria-labelledby]");
    expect(region).not.toBeNull();
    // Ningún error de validación visible con datos vacíos.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("BasicsForm_Is_Keyboard_Accessible_Tab_Through_All_Fields — a11y tab order", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BasicsForm basics={makeBasics()} onChange={onChange} />);
    const nameInput = screen.getByLabelText(/nombre/i);
    nameInput.focus();
    expect(nameInput).toHaveFocus();
    // Tab debe mover el foco al siguiente campo (email).
    await user.tab();
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveFocus();
    // Tab debe seguir moviendo foco progresivamente.
    await user.tab();
    const phoneInput = screen.getByLabelText(/tel[eé]fono/i);
    expect(phoneInput).toHaveFocus();
  });
});
