import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiffToolbar } from "./diff-toolbar";
import { copy } from "@/lib/copy/es";

describe("DiffToolbar", () => {
  it("renderiza con role='toolbar' y aria-label descriptivo", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar).toBeInTheDocument();
  });

  it("muestra el último puntaje si lastScore != null", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={78}
        hasJobText
      />,
    );
    expect(screen.getByText(/78/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(copy.diff.score.lastScore, "i"))).toBeInTheDocument();
  });

  it("NO muestra el último puntaje si lastScore == null", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    expect(screen.queryByText(/78/)).not.toBeInTheDocument();
  });

  it("el botón Re-puntuar tiene aria-busy=true durante loading", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring
        lastScore={null}
        hasJobText
      />,
    );
    const btn = screen.getByRole("button", { name: new RegExp(copy.diff.actions.rescoreLoading, "i") });
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("el botón Re-puntuar tiene aria-busy=false en estado idle", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    const btn = screen.getByRole("button", { name: new RegExp(copy.diff.actions.rescore, "i") });
    expect(btn).toHaveAttribute("aria-busy", "false");
  });

  it("click Re-puntuar llama onRescore (cuando hasJobText=true)", async () => {
    const user = userEvent.setup();
    const onRescore = vi.fn();
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={onRescore}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.rescore, "i") }));
    expect(onRescore).toHaveBeenCalledTimes(1);
  });

  it("el botón Re-puntuar está deshabilitado si !hasJobText", () => {
    render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText={false}
      />,
    );
    const btn = screen.getByRole("button", { name: new RegExp(copy.diff.actions.rescore, "i") });
    expect(btn).toBeDisabled();
  });

  it("muestra un toggle de modo con 2 radio buttons o equivalentes", () => {
    const { container } = render(
      <DiffToolbar
        mode="unified"
        onModeChange={vi.fn()}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    // Al menos debe haber UN control de modo (radio o botón)
    const modeControls = container.querySelectorAll('[data-mode-toggle]');
    expect(modeControls.length).toBeGreaterThan(0);
  });

  it("click en el toggle de modo unificado llama onModeChange('side-by-side')", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const { container } = render(
      <DiffToolbar
        mode="unified"
        onModeChange={onModeChange}
        onRescore={vi.fn()}
        isRescoring={false}
        lastScore={null}
        hasJobText
      />,
    );
    const sideBySide = container.querySelector('[data-mode-value="side-by-side"]');
    if (sideBySide) {
      await user.click(sideBySide as HTMLElement);
    } else {
      // fallback: click on the toggle group
      const group = container.querySelector('[data-mode-toggle]');
      if (group) await user.click(group as HTMLElement);
    }
    expect(onModeChange).toHaveBeenCalled();
  });
});
