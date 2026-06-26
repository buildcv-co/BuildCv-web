/**
 * Tests RED → GREEN del componente `WorkList` (PR 4c).
 *
 * Cubre el shell de la sección work del editor JSON Resume:
 *  1. Renderiza todos los work items recibidos.
 *  2. Click "Agregar experiencia" → append blank item + onChange.
 *  3. Click remove en un item → remove + onChange.
 *  4. Editar `startDate` de un item → onChange con valor actualizado.
 *  5. Keyboard flow — startDate vacío enfoca endDate al tabular.
 *
 * El componente es presentacional + `onChange` (PR 4e lo monta en
 * `editor.tsx`). No promueve confianza — eso es PR 4d.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkList } from "@/components/editor/work-list";
import type { Work } from "@/lib/editor/types";

const WORK_CONFIDENCE = {
  name: "inferred",
  position: "inferred",
  startDate: "inferred",
  endDate: "inferred",
  summary: "inferred",
  highlights: "inferred",
} as const;

function makeWork(overrides: Partial<Work> = {}): Work {
  return {
    name: "Acme Corp",
    position: "Backend Developer",
    startDate: "2022-01",
    endDate: "2024-06",
    summary: "",
    highlights: [],
    confidence: { ...WORK_CONFIDENCE },
    ...overrides,
  } as Work;
}

describe("WorkList", () => {
  it("WorkList_Renders_All_Work_Items", () => {
    const onChange = vi.fn();
    render(
      <WorkList
        items={[makeWork({ name: "Acme Corp" }), makeWork({ name: "Globex" })]}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Globex")).toBeInTheDocument();
  });

  it("WorkList_ClickAdd_Appends_Blank_Item_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WorkList items={[makeWork()]} onChange={onChange} />);
    const addBtn = screen.getByRole("button", { name: /agregar experiencia/i });
    await user.click(addBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Work[];
    expect(next).toHaveLength(2);
    // El item nuevo está en blanco y marcado user_confirmed (porque el
    // usuario lo está creando activamente — ver PR 4d para el rule general).
    const appended = next[1];
    expect(appended.name).toBe("");
    expect(appended.confidence.name).toBe("user_confirmed");
  });

  it("WorkList_ClickRemove_On_Item_Removes_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <WorkList
        items={[makeWork({ name: "Acme Corp" }), makeWork({ name: "Globex" })]}
        onChange={onChange}
      />,
    );
    const removeBtns = screen.getAllByRole("button", { name: /eliminar experiencia/i });
    await user.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Work[];
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("Globex");
  });

  it("WorkList_Edit_Item_StartDate_Updates_And_Calls_OnChange", () => {
    const onChange = vi.fn();
    render(<WorkList items={[makeWork()]} onChange={onChange} />);
    const startInputs = screen.getAllByLabelText(/fecha inicio/i);
    fireEvent.change(startInputs[0], { target: { value: "2021-03" } });
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Work[];
    expect(lastCall[0].startDate).toBe("2021-03");
  });

  it("WorkList_Empty_StartDate_Focuses_EndDate_Field — keyboard flow", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WorkList items={[makeWork({ startDate: "" })]} onChange={onChange} />);
    const startInput = screen.getByLabelText(/fecha inicio/i);
    await user.click(startInput);
    // Tab desde startDate → endDate.
    await user.tab();
    const endInput = screen.getByLabelText(/fecha fin/i);
    expect(endInput).toHaveFocus();
  });
});
