import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegenerateButton } from "./regenerate-button";

describe("RegenerateButton", () => {
  it("renderiza el label de regenerate del copy", () => {
    render(<RegenerateButton onClick={vi.fn()} loading={false} />);
    expect(screen.getByRole("button", { name: /regenerar/i })).toBeInTheDocument();
  });

  it("click llama onClick", async () => {
    const onClick = vi.fn();
    render(<RegenerateButton onClick={onClick} loading={false} />);
    await userEvent.click(screen.getByRole("button", { name: /regenerar/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("loading=true: deshabilita el botón (no llama onClick)", async () => {
    const onClick = vi.fn();
    render(<RegenerateButton onClick={onClick} loading={true} />);
    const btn = screen.getByRole("button", { name: /regenerar/i });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("loading=true: aria-busy='true'", () => {
    render(<RegenerateButton onClick={vi.fn()} loading={true} />);
    expect(screen.getByRole("button", { name: /regenerar/i })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("loading=false: aria-busy='false'", () => {
    render(<RegenerateButton onClick={vi.fn()} loading={false} />);
    expect(screen.getByRole("button", { name: /regenerar/i })).toHaveAttribute(
      "aria-busy",
      "false",
    );
  });
});
