import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "./file-upload";
import { copy } from "@/lib/copy/es";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob(["x".repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

function getDropzone() {
  return screen.getByTestId("file-upload-dropzone");
}

function getFileInput(container: HTMLElement) {
  return container.querySelector("input[type='file']") as HTMLInputElement;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FileUpload — accesibilidad y render inicial", () => {
  it("renderiza un <label> con htmlFor apuntando al input (activación nativa, WCAG 2.2 AA)", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const dropzone = getDropzone();
    expect(dropzone.tagName).toBe("LABEL");
    const input = getFileInput(container);
    expect(dropzone.getAttribute("for")).toBe(input.id);
  });

  it("el input NO tiene aria-hidden (evita warning de focus en elemento oculto)", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = getFileInput(container);
    expect(input.getAttribute("aria-hidden")).toBeNull();
  });

  it("tiene aria-describedby apuntando a instrucciones (formato + tamaño)", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    const dropzone = getDropzone();
    const describedById = dropzone.getAttribute("aria-describedby");
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

  it("contiene un <input type='file' sr-only>", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = getFileInput(container);
    expect(input).toBeTruthy();
    expect(input.classList.contains("sr-only")).toBe(true);
    const inputAccept = input.getAttribute("accept");
    expect(inputAccept).toContain("application/pdf");
    expect(inputAccept).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });
});

describe("FileUpload — interacciones", () => {
  it("click en el label → activa el input (label control association)", async () => {
    const user = userEvent.setup();
    const { container } = render(<FileUpload onFileSelected={vi.fn()} />);
    const input = getFileInput(container);
    const dropzone = getDropzone();
    const focusSpy = vi.spyOn(input, "focus");
    await user.click(dropzone);
    expect(focusSpy).toHaveBeenCalled();
  });

  it("input.change con archivo válido → llama onFileSelected con el File", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = getFileInput(container);
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0]?.[0]).toBe(file);
  });

  it("input.change con archivo inválido (text/plain) → NO llama onFileSelected, muestra error", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = getFileInput(container);
    const file = makeFile("fake.pdf", "text/plain", 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
  });

  it("input.change con archivo >5MB → NO llama onFileSelected, muestra error de tamaño", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = getFileInput(container);
    const file = makeFile("big.pdf", "application/pdf", 6 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.tooLarge)).toBeInTheDocument();
  });

  it("input.change con archivo vacío (size=0) → NO llama onFileSelected, muestra error", async () => {
    const onFileSelected = vi.fn();
    const { container } = render(<FileUpload onFileSelected={onFileSelected} />);
    const input = getFileInput(container);
    const file = makeFile("empty.pdf", "application/pdf", 0);
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.clientValidation)).toBeInTheDocument();
  });
});

describe("FileUpload — drag and drop", () => {
  it("dragover NO navega fuera de la página (preventDefault)", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    const dropZone = getDropzone();
    const dragOver = new Event("dragover", { bubbles: true, cancelable: true });
    fireEvent(dropZone, dragOver);
    expect(dragOver.defaultPrevented).toBe(true);
  });

  it("drop con archivo válido (PDF) → llama onFileSelected", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = getDropzone();
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(onFileSelected).toHaveBeenCalledTimes(1);
    expect(onFileSelected.mock.calls[0]?.[0]).toBe(file);
  });

  it("drop con archivo inválido (.txt) → NO llama onFileSelected, muestra error", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = getDropzone();
    const file = makeFile("cv.txt", "text/plain", 1024);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.unsupportedMime)).toBeInTheDocument();
  });

  it("drop con archivo >5MB → NO llama onFileSelected, muestra error de tamaño", () => {
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);
    const dropZone = getDropzone();
    const file = makeFile("big.pdf", "application/pdf", 6 * 1024 * 1024);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByText(copy.import.errors.tooLarge)).toBeInTheDocument();
  });
});

describe("FileUpload — estado 'dragover' visual", () => {
  it("mientras hay dragover, el atributo data-drag-active pasa a true", () => {
    render(<FileUpload onFileSelected={vi.fn()} />);
    const dropZone = getDropzone();
    expect(dropZone.getAttribute("data-drag-active")).toBe("false");
    fireEvent.dragEnter(dropZone);
    expect(dropZone.getAttribute("data-drag-active")).toBe("true");
    fireEvent.dragLeave(dropZone);
    expect(dropZone.getAttribute("data-drag-active")).toBe("false");
  });
});

describe("FileUpload — estado deshabilitado", () => {
  it("disabled=true → el input está disabled (no se puede activar)", () => {
    const { container } = render(<FileUpload onFileSelected={vi.fn()} disabled />);
    const input = getFileInput(container);
    expect(input).toBeDisabled();
  });

  it("disabled=true → aria-disabled en el label", () => {
    render(<FileUpload onFileSelected={vi.fn()} disabled />);
    const dropzone = getDropzone();
    expect(dropzone).toHaveAttribute("aria-disabled", "true");
  });
});
