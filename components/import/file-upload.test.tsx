import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "./file-upload";
import { copy } from "@/lib/copy/es";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob(["x".repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FileUpload — accesibilidad y render inicial", () => {
  it("renderiza con role='button' y aria-label descriptivo (WCAG 2.2 AA)", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    const button = screen.getByRole("button", { name: /cargar cv en pdf o docx/i });
    expect(button).toBeInTheDocument();
  });

  it("tiene aria-describedby apuntando a instrucciones (formato + tamaño)", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    const describedById = button.getAttribute("aria-describedby");
    expect(describedById).toBeTruthy();
    if (!describedById) return;
    const hint = document.getElementById(describedById);
    expect(hint).toBeTruthy();
    expect(hint?.textContent ?? "").toMatch(/PDF o DOCX/);
    expect(hint?.textContent ?? "").toMatch(/5 MB/);
  });

  it("muestra el texto de drop zone (dragHere + or + clickToSelect)", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    expect(screen.getByText(copy.import.page.dragHere)).toBeInTheDocument();
    expect(screen.getByText(copy.import.page.or)).toBeInTheDocument();
    expect(screen.getByText(copy.import.page.clickToSelect)).toBeInTheDocument();
  });

  it("contiene un <input type='file' hidden> para activar programáticamente", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = container.querySelector("input[type='file']");
    expect(input).toBeTruthy();
    expect(input?.classList.contains("hidden")).toBe(true);
    const inputAccept = input?.getAttribute("accept");
    expect(inputAccept).toContain("application/pdf");
    expect(inputAccept).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});

describe("FileUpload — interacciones", () => {
  it("click en el área → abre el file picker (input.click() llamado)", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    await user.click(button);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("teclado: Enter en el área → abre el file picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    button.focus();
    await user.keyboard("{Enter}");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("teclado: Space en el área → abre el file picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    button.focus();
    await user.keyboard(" ");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("input.change con archivo válido → llama onFileSelected con el File", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0]?.[0]).toBe(file);
  });

  it("input.change con archivo inválido (text/plain) → NO llama onFileSelected, muestra error", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("fake.pdf", "text/plain", 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
  });

  it("input.change con archivo >5MB → NO llama onFileSelected, muestra error de tamaño", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("big.pdf", "application/pdf", 6 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.tooLarge)).toBeInTheDocument();
  });

  it("input.change con archivo vacío (size=0) → NO llama onFileSelected, muestra error", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = makeFile("empty.pdf", "application/pdf", 0);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.clientValidation)).toBeInTheDocument();
  });
});

describe("FileUpload — drag and drop", () => {
  it("dragover NO navega fuera de la página (preventDefault)", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const dropZone = container.querySelector("[data-testid='file-upload-dropzone']");
    expect(dropZone).toBeTruthy();
    const dragOver = new Event("dragover", { bubbles: true, cancelable: true });
    fireEvent(dropZone as Element, dragOver);
    expect(dragOver.defaultPrevented).toBe(true);
  });

  it("drop con archivo válido (PDF) → llama onFileSelected", () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = container.querySelector("[data-testid='file-upload-dropzone']");
    expect(dropZone).toBeTruthy();
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    fireEvent.drop(dropZone as Element, { dataTransfer: { files: [file] } });
    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0]?.[0]).toBe(file);
  });

  it("drop con archivo inválido (.txt) → NO llama onFileSelected, muestra error", () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = container.querySelector("[data-testid='file-upload-dropzone']");
    expect(dropZone).toBeTruthy();
    const file = makeFile("cv.txt", "text/plain", 1024);
    fireEvent.drop(dropZone as Element, { dataTransfer: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
  });

  it("drop con archivo >5MB → NO llama onFileSelected, muestra error de tamaño", () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = container.querySelector("[data-testid='file-upload-dropzone']");
    expect(dropZone).toBeTruthy();
    const file = makeFile("big.pdf", "application/pdf", 6 * 1024 * 1024);
    fireEvent.drop(dropZone as Element, { dataTransfer: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.tooLarge)).toBeInTheDocument();
  });
});

describe("FileUpload — estado 'dragover' visual", () => {
  it("mientras hay dragover, el atributo data-drag-active pasa a true", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const dropZone = container.querySelector("[data-testid='file-upload-dropzone']");
    expect(dropZone).toBeTruthy();
    expect(dropZone?.getAttribute("data-drag-active")).toBe("false");
    fireEvent.dragEnter(dropZone as Element);
    expect(dropZone?.getAttribute("data-drag-active")).toBe("true");
    fireEvent.dragLeave(dropZone as Element);
    expect(dropZone?.getAttribute("data-drag-active")).toBe("false");
  });
});

describe("FileUpload — estado deshabilitado", () => {
  it("disabled=true → click NO abre el picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} disabled />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    await user.click(button);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });

  it("disabled=true → keyboard Enter NO abre el picker", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} disabled />);
    const input = container.querySelector("input[type='file']") as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => undefined);
    const button = screen.getByRole("button", { name: /cargar cv/i });
    button.focus();
    await user.keyboard("{Enter}");
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
