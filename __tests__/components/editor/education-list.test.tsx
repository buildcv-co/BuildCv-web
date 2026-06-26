/**
 * Tests RED → GREEN del componente `EducationList` (PR 4c).
 *
 * Cubre el shell de la sección education del editor JSON Resume (mismo
 * patrón que WorkList pero para educación):
 *  1. Renderiza todos los education items recibidos.
 *  2. Click "Agregar educación" → append blank item + onChange.
 *  3. Click remove en un item → remove + onChange.
 *  4. Editar `institution` de un item → onChange con valor actualizado.
 *
 * El componente es presentacional + `onChange` (PR 4e lo monta en
 * `editor.tsx`). No promueve confianza — eso es PR 4d.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EducationList } from "@/components/editor/education-list";
import type { Education } from "@/lib/editor/types";

const EDU_CONFIDENCE = {
  institution: "inferred",
  area: "inferred",
  studyType: "inferred",
  startDate: "inferred",
  endDate: "inferred",
  score: "inferred",
} as const;

function makeEducation(overrides: Partial<Education> = {}): Education {
  return {
    institution: "Universidad de Antioquia",
    area: "Ingeniería de Sistemas",
    studyType: "Pregrado",
    startDate: "2015-01",
    endDate: "2020-06",
    score: "",
    courses: [],
    confidence: { ...EDU_CONFIDENCE },
    ...overrides,
  } as Education;
}

describe("EducationList", () => {
  it("EducationList_Renders_All_Education_Items", () => {
    const onChange = vi.fn();
    render(
      <EducationList
        items={[makeEducation({ institution: "UdeA" }), makeEducation({ institution: "EAFIT" })]}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("UdeA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("EAFIT")).toBeInTheDocument();
  });

  it("EducationList_ClickAdd_Appends_Blank_Item_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EducationList items={[makeEducation()]} onChange={onChange} />);
    const addBtn = screen.getByRole("button", { name: /agregar educaci[oó]n/i });
    await user.click(addBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Education[];
    expect(next).toHaveLength(2);
    const appended = next[1];
    expect(appended.institution).toBe("");
    expect(appended.confidence.institution).toBe("user_confirmed");
  });

  it("EducationList_ClickRemove_On_Item_Removes_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EducationList
        items={[makeEducation({ institution: "UdeA" }), makeEducation({ institution: "EAFIT" })]}
        onChange={onChange}
      />,
    );
    const removeBtns = screen.getAllByRole("button", { name: /eliminar educaci[oó]n/i });
    await user.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Education[];
    expect(next).toHaveLength(1);
    expect(next[0].institution).toBe("EAFIT");
  });

  it("EducationList_Edit_Institution_Updates_And_Calls_OnChange", () => {
    const onChange = vi.fn();
    render(<EducationList items={[makeEducation()]} onChange={onChange} />);
    const instInput = screen.getByDisplayValue(
      "Universidad de Antioquia",
    ) as HTMLInputElement;
    fireEvent.change(instInput, { target: { value: "Universidad Nacional" } });
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Education[];
    expect(lastCall[0].institution).toBe("Universidad Nacional");
  });
});
