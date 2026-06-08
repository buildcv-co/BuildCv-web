import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("une clases separadas por un solo espacio", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("ignora valores falsy (false, null, undefined, string vacío)", () => {
    expect(cn("a", false, null, undefined, "")).toBe("a");
  });

  it("deduplica clases vía filter(Boolean) — sin colisiones", () => {
    expect(cn("px-2", "px-4")).toBe("px-2 px-4");
  });

  it("devuelve string vacío cuando no hay entradas válidas", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});
