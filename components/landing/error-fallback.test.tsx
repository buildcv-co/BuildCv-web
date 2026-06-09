import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorFallback } from "./error-fallback";

describe("ErrorFallback", () => {
  it("renderiza title y detail", () => {
    render(<ErrorFallback title="Algo se rompió" detail="No es tu culpa." />);
    expect(screen.getByRole("heading", { level: 1, name: "Algo se rompió" })).toBeInTheDocument();
    expect(screen.getByText("No es tu culpa.")).toBeInTheDocument();
  });

  it("renderiza con role='alert' (a11y)", () => {
    render(<ErrorFallback title="X" detail="Y" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("muestra botón de retry cuando se pasa onRetry", () => {
    const onRetry = (): void => undefined;
    render(<ErrorFallback title="X" detail="Y" onRetry={onRetry} retryLabel="Reintentar" />);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("muestra link a / cuando se pasa showHomeLink", () => {
    render(<ErrorFallback title="X" detail="Y" showHomeLink homeLabel="Volver al inicio" />);
    const link = screen.getByRole("link", { name: "Volver al inicio" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("click en retry invoca onRetry", async () => {
    const user = userEvent.setup();
    let called = 0;
    const onRetry = (): void => {
      called += 1;
    };
    render(<ErrorFallback title="X" detail="Y" onRetry={onRetry} retryLabel="Reintentar" />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(called).toBe(1);
  });

  it("NO muestra botón de retry si no se pasa onRetry", () => {
    render(<ErrorFallback title="X" detail="Y" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("NO muestra link a / si no se pasa showHomeLink", () => {
    render(<ErrorFallback title="X" detail="Y" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("acepta links adicionales via children", () => {
    render(
      <ErrorFallback title="X" detail="Y">
        <a href="/analizar">Ir a analizar</a>
      </ErrorFallback>,
    );
    const link = screen.getByRole("link", { name: "Ir a analizar" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/analizar");
  });
});
