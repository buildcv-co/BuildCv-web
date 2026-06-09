import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffView } from "./diff-view";
import { computeDiff } from "@/lib/diff/compute-diff";
import { flagEntitiesInDiff } from "@/lib/diff/flag-entities";
import type { EntityInvention } from "@/lib/api/types";

function makeResult(before: string, after: string, inventions: EntityInvention[] = []) {
  const diff = computeDiff(before, after);
  return flagEntitiesInDiff(diff, inventions);
}

describe("DiffView", () => {
  it("renderiza con role='region' y aria-label descriptivo", () => {
    const result = makeResult("a b c", "a X c");
    render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    const region = screen.getByRole("region");
    expect(region).toBeInTheDocument();
    expect(region.getAttribute("aria-label")).toMatch(/diff/i);
  });

  it("modo unificado → una sola columna", () => {
    const result = makeResult("hello", "hello world");
    render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-mode", "unified");
  });

  it("modo side-by-side → dos columnas con aria-label 'original' y 'adaptado'", () => {
    const result = makeResult("hello", "hello world");
    render(<DiffView segments={result.segments} mode="side-by-side" onModeChange={vi.fn()} />);
    const original = screen.getByLabelText(/columna cv original/i);
    const adapted = screen.getByLabelText(/columna cv adaptado/i);
    expect(original).toBeInTheDocument();
    expect(adapted).toBeInTheDocument();
  });

  it("el botón de toggle llama onModeChange con el modo alterno", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiffView segments={makeResult("a", "b").segments} mode="unified" onModeChange={onChange} />);
    const toggle = screen.getByRole("button", { name: /cambiar modo/i });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith("side-by-side");
  });

  it("el botón de toggle desde side-by-side llama onModeChange('unified')", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiffView segments={makeResult("a", "b").segments} mode="side-by-side" onModeChange={onChange} />);
    const toggle = screen.getByRole("button", { name: /cambiar modo/i });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith("unified");
  });

  it("los segmentos 'added' tienen un span con data-kind='added'", () => {
    const result = makeResult("a b", "a c");
    const { container } = render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    const added = container.querySelector('[data-kind="added"]');
    expect(added).toBeInTheDocument();
  });

  it("los segmentos 'removed' tienen un span con data-kind='removed'", () => {
    const result = makeResult("a b", "a c");
    const { container } = render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    const removed = container.querySelector('[data-kind="removed"]');
    expect(removed).toBeInTheDocument();
  });

  it("el contenedor tiene aria-live='polite' para anunciar cambios de modo", () => {
    render(<DiffView segments={makeResult("a", "b").segments} mode="unified" onModeChange={vi.fn()} />);
    expect(screen.getByRole("region")).toHaveAttribute("aria-live", "polite");
  });

  it("en modo unificado, los segmentos 'removed' se renderizan con un '-' prefijo (visual)", () => {
    const result = makeResult("hello", "hi");
    const { container } = render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/[-−]/);
  });

  it("en modo unificado, los segmentos 'added' se renderizan con un '+' prefijo (visual)", () => {
    const result = makeResult("hello", "hello world");
    const { container } = render(<DiffView segments={result.segments} mode="unified" onModeChange={vi.fn()} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/[+]/);
  });
});
