/**
 * Tests RED → GREEN del componente `SkillsByCategory` (PR 4c).
 *
 * Cubre el shell de la sección skills del editor JSON Resume (el campo
 * `name` de cada `Skills` es la categoría — backend emite skills ya
 * agrupados; el componente los renderiza con header por categoría):
 *  1. Agrupa items por `name` (categoría) y renderiza un header por grupo.
 *  2. Click "Agregar habilidad" → append blank item + onChange.
 *  3. Click remove en un item → remove + onChange.
 *  4. Editar `name` de un item → onChange con valor actualizado.
 *
 * El componente es presentacional + `onChange` (PR 4e lo monta en
 * `editor.tsx`). No promueve confianza — eso es PR 4d.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkillsByCategory } from "@/components/editor/skills-by-category";
import type { Skills } from "@/lib/editor/types";

const SKILL_CONFIDENCE = {
  name: "inferred",
  level: "inferred",
  keywords: "inferred",
} as const;

function makeSkill(overrides: Partial<Skills> = {}): Skills {
  return {
    name: "Backend",
    level: "Avanzado",
    keywords: ["TypeScript", "Node.js"],
    confidence: { ...SKILL_CONFIDENCE },
    ...overrides,
  } as Skills;
}

describe("SkillsByCategory", () => {
  it("SkillsByCategory_Groups_Items_By_Category_Name — renderiza un header por categoría", () => {
    const onChange = vi.fn();
    render(
      <SkillsByCategory
        items={[
          makeSkill({ name: "Backend", keywords: ["Node", "Postgres"] }),
          makeSkill({ name: "Frontend", keywords: ["React", "CSS"] }),
        ]}
        onChange={onChange}
      />,
    );
    // Cada categoría debe aparecer como heading accesible.
    const backendHeading = screen.getByRole("heading", { name: /backend/i });
    const frontendHeading = screen.getByRole("heading", { name: /frontend/i });
    expect(backendHeading).toBeInTheDocument();
    expect(frontendHeading).toBeInTheDocument();
    // Los keywords de cada grupo son visibles en la página.
    expect(screen.getByDisplayValue(/node/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/react/i)).toBeInTheDocument();
  });

  it("SkillsByCategory_ClickAdd_Appends_Blank_Category_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SkillsByCategory items={[makeSkill()]} onChange={onChange} />);
    const addBtn = screen.getByRole("button", { name: /agregar habilidad/i });
    await user.click(addBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Skills[];
    expect(next).toHaveLength(2);
    const appended = next[1];
    expect(appended.name).toBe("");
    expect(appended.confidence.name).toBe("user_confirmed");
  });

  it("SkillsByCategory_ClickRemove_On_Item_Removes_And_Calls_OnChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SkillsByCategory
        items={[makeSkill({ name: "Backend" }), makeSkill({ name: "Frontend" })]}
        onChange={onChange}
      />,
    );
    const removeBtns = screen.getAllByRole("button", { name: /eliminar habilidad/i });
    await user.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Skills[];
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe("Frontend");
  });

  it("SkillsByCategory_Edit_Category_Name_Updates_And_Calls_OnChange", () => {
    const onChange = vi.fn();
    render(<SkillsByCategory items={[makeSkill({ name: "Backend" })]} onChange={onChange} />);
    const nameInput = screen.getByDisplayValue("Backend") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "DevOps" } });
    const lastCall = onChange.mock.calls.at(-1)?.[0] as Skills[];
    expect(lastCall[0].name).toBe("DevOps");
  });
});
