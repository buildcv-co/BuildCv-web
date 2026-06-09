import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SectionNode } from "./section-node";
import type { CvSection } from "@/lib/editor/types";
import { copy } from "@/lib/copy/es";

const ISO = "2026-06-08T14:30:00.000Z";

function makeProfile(overrides: Partial<Extract<CvSection, { kind: "profile" }>> = {}): Extract<CvSection, { kind: "profile" }> {
  return {
    id: "sec_01",
    kind: "profile",
    source: "user-typed",
    createdAt: ISO,
    updatedAt: ISO,
    fullName: "Juan",
    headline: "Backend",
    email: "j@x.com",
    phone: "",
    location: "",
    links: [],
    summary: "",
    ...overrides,
  };
}

describe("SectionNode — Profile", () => {
  it("renderiza label 'Perfil' y los inputs", () => {
    render(
      <SectionNode section={makeProfile()} onChange={vi.fn()} />,
    );
    expect(screen.getByText(copy.editor.sections.profile)).toBeInTheDocument();
    expect(
      screen.getByLabelText(copy.editor.placeholders.profileFullName),
    ).toBeInTheDocument();
  });

  it("onChange del fullName dispara con la sección actualizada", () => {
    const onChange = vi.fn();
    render(
      <SectionNode section={makeProfile()} onChange={onChange} />,
    );
    const input = screen.getByLabelText(
      copy.editor.placeholders.profileFullName,
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Pedro" } });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0] as CvSection;
    expect(last.kind).toBe("profile");
    if (last.kind === "profile") {
      expect(last.fullName).toBe("Pedro");
    }
  });

  it("input fullName tiene id asociado al label (a11y)", () => {
    render(
      <SectionNode section={makeProfile()} onChange={vi.fn()} />,
    );
    const input = screen.getByLabelText(
      copy.editor.placeholders.profileFullName,
    );
    const id = input.getAttribute("id");
    expect(id).toBeTruthy();
    const label = document.querySelector(`label[for="${id}"]`);
    expect(label).toBeInTheDocument();
  });
});

describe("SectionNode — Experience (con bullets)", () => {
  it("renderiza label 'Experiencia' y textarea para bullets", () => {
    const exp: Extract<CvSection, { kind: "experience" }> = {
      id: "sec_02",
      kind: "experience",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      role: "Backend",
      company: "Acme",
      startDate: "2022-01",
      endDate: null,
      location: "",
      bullets: ["x"],
      techStack: [],
    };
    render(<SectionNode section={exp} onChange={vi.fn()} />);
    expect(screen.getByText(copy.editor.sections.experience)).toBeInTheDocument();
    expect(
      screen.getByLabelText(copy.editor.placeholders.experienceRole),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(copy.editor.placeholders.experienceBullet),
    ).toBeInTheDocument();
  });
});

describe("SectionNode — Skills (con grupos)", () => {
  it("renderiza label 'Habilidades' e input de categoría", () => {
    const skills: Extract<CvSection, { kind: "skills" }> = {
      id: "sec_04",
      kind: "skills",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      groups: [{ category: "Backend", items: ["Node.js"] }],
    };
    render(<SectionNode section={skills} onChange={vi.fn()} />);
    expect(screen.getByText(copy.editor.sections.skills)).toBeInTheDocument();
    expect(
      screen.getByLabelText(copy.editor.placeholders.skillsCategory),
    ).toBeInTheDocument();
  });
});

describe("SectionNode — placeholder correcto por kind", () => {
  it("Profile → 'Perfil'", () => {
    render(<SectionNode section={makeProfile()} onChange={vi.fn()} />);
    expect(screen.getByText("Perfil")).toBeInTheDocument();
  });
});
