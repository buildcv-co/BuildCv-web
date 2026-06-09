import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlaggedEntityBadge } from "./flagged-entity-badge";
import type { FlaggedEntity } from "@/lib/diff/types";

function flag(over: Partial<FlaggedEntity> = {}): FlaggedEntity {
  return {
    entity: {
      type: "Company",
      claimed: "FakeCorp",
      original: null,
      severity: "Hard",
      position: 0,
    },
    position: 0,
    color: "hard",
    ...over,
  };
}

describe("FlaggedEntityBadge", () => {
  it("badge Soft (severity Soft) tiene aria-label con la severidad y el término", () => {
    const onEdit = vi.fn();
    const onKeep = vi.fn();
    render(
      <FlaggedEntityBadge
        flag={flag({
          entity: { type: "Metric", claimed: "40%", original: "35%", severity: "Soft", position: 0 },
          color: "soft",
        })}
        onEdit={onEdit}
        onKeep={onKeep}
      />,
    );
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label.toLowerCase()).toContain("advertencia");
    expect(label.toLowerCase()).toContain("soft");
    expect(label).toContain("40%");
  });

  it("badge Hard tiene aria-label con la severidad y el término", () => {
    render(
      <FlaggedEntityBadge
        flag={flag({
          entity: { type: "Company", claimed: "FakeCorp", original: null, severity: "Hard", position: 0 },
          color: "hard",
        })}
        onEdit={vi.fn()}
        onKeep={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label.toLowerCase()).toContain("advertencia");
    expect(label.toLowerCase()).toContain("hard");
    expect(label).toContain("FakeCorp");
  });

  it("click en el badge abre un popover con 2 botones: Editar y Mantener", async () => {
    const user = userEvent.setup();
    render(
      <FlaggedEntityBadge flag={flag()} onEdit={vi.fn()} onKeep={vi.fn()} />,
    );
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mantener/i })).toBeInTheDocument();
  });

  it("click 'Editar' llama onEdit y cierra el popover", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <FlaggedEntityBadge flag={flag()} onEdit={onEdit} onKeep={vi.fn()} />,
    );
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("click 'Mantener' llama onKeep y cierra el popover", async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    render(
      <FlaggedEntityBadge flag={flag()} onEdit={vi.fn()} onKeep={onKeep} />,
    );
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("button", { name: /mantener/i }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape cierra el popover sin llamar onEdit/onKeep", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onKeep = vi.fn();
    render(
      <FlaggedEntityBadge flag={flag()} onEdit={onEdit} onKeep={onKeep} />,
    );
    await user.click(screen.getByRole("button"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
    expect(onKeep).not.toHaveBeenCalled();
  });

  it("badge Hard muestra un icono X (data-icon='x' o aria-label 'X')", () => {
    const { container } = render(
      <FlaggedEntityBadge flag={flag({ color: "hard" })} onEdit={vi.fn()} onKeep={vi.fn()} />,
    );
    const xMark = container.querySelector('[data-icon="x"]');
    expect(xMark).toBeInTheDocument();
  });

  it("badge Soft NO muestra el icono X", () => {
    const { container } = render(
      <FlaggedEntityBadge
        flag={flag({ color: "soft" })}
        onEdit={vi.fn()}
        onKeep={vi.fn()}
      />,
    );
    const xMark = container.querySelector('[data-icon="x"]');
    expect(xMark).not.toBeInTheDocument();
  });
});
