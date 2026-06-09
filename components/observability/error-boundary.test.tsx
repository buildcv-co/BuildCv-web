import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary";

// Componente de testing que lanza en render o bajo control
function ThrowingComponent({
  shouldThrow = true,
  message = "boundary test",
}: {
  shouldThrow?: boolean;
  message?: string;
}): React.JSX.Element {
  if (shouldThrow) throw new Error(message);
  return <div>ok</div>;
}

describe("ErrorBoundary", () => {
  let consoleErrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React 19 loggea los errores de boundary a console.error.
    // Lo silenciamos para no ensuciar el output del test.
    consoleErrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrSpy.mockRestore();
  });

  it("renderiza children sin error", () => {
    render(
      <ErrorBoundary>
        <div>child content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("captura error en children y muestra fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="exploto" />
      </ErrorBoundary>,
    );
    // El fallback muestra el title del copy
    expect(
      screen.getByText(/algo se rompió en este componente/i),
    ).toBeInTheDocument();
  });

  it("onError callback se llama con el error", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent message="reportable" />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    const err = onError.mock.calls[0]?.[0] as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("reportable");
  });

  it("fallback tiene role='alert' y aria-live='polite'", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("click 'Reintentar' resetea el boundary (vuelve a renderizar children)", () => {
    // Testea el camino común: un componente que tira en mount, después
    // de hacer click en "Reintentar" el boundary se resetea y los children
    // se vuelven a renderizar (si no tiran, los vemos).
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} message="retry me" />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/algo se rompió en este componente/i),
    ).toBeInTheDocument();
    // Re-renderizamos con un child que NO tira. Como react-error-boundary
    // mantiene el estado, el fallback sigue visible. El botón "Reintentar"
    // cambia didCatch a false y remonta children.
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} message="retry me" />
      </ErrorBoundary>,
    );
    const retry = screen.getByRole("button", { name: /reintent/i });
    fireEvent.click(retry);
    // Después del reset, si children no tiran, vemos su contenido
    expect(
      screen.queryByText(/algo se rompió en este componente/i),
    ).not.toBeInTheDocument();
  });

  it("acepta fallback prop custom", () => {
    render(
      <ErrorBoundary fallback={(err) => <div>custom: {err.message}</div>}>
        <ThrowingComponent message="custom-fb" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom: custom-fb")).toBeInTheDocument();
  });

  it("el error original se loggea a console.error (Reporte al error-reporter)", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="logged" />
      </ErrorBoundary>,
    );
    // React 19 loggea el error; no verificamos el contenido exacto, solo que
    // hubo al menos un log.
    expect(consoleErrSpy).toHaveBeenCalled();
  });
});
