import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilenameHint } from "./filename-hint";

describe("FilenameHint", () => {
  it("renderiza el filename interpolado con la fecha YYYY-MM-DD", () => {
    const date = new Date("2026-06-08T12:00:00Z");
    render(<FilenameHint date={date} />);
    expect(screen.getByText("cv-adapted-2026-06-08.pdf")).toBeInTheDocument();
  });

  it("paddings MM y DD a 2 dígitos", () => {
    const date = new Date("2026-01-05T12:00:00Z");
    render(<FilenameHint date={date} />);
    expect(screen.getByText("cv-adapted-2026-01-05.pdf")).toBeInTheDocument();
  });

  it("expone aria-label accesible con el filename", () => {
    const date = new Date("2026-06-08T12:00:00Z");
    render(<FilenameHint date={date} />);
    const el = screen.getByLabelText("cv-adapted-2026-06-08.pdf");
    expect(el).toBeInTheDocument();
  });
});
