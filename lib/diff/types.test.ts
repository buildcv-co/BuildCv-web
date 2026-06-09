import { describe, it, expect } from "vitest";
import type {
  DiffChange,
  FlaggedEntity,
  DiffHandoff,
  DiffMode,
} from "./types";

describe("DiffChange shape", () => {
  it("acepta kind 'added' | 'removed' | 'unchanged' y value string", () => {
    const a: DiffChange = { kind: "added", value: "hello" };
    const b: DiffChange = { kind: "removed", value: "world" };
    const c: DiffChange = { kind: "unchanged", value: "before " };
    expect(a.kind).toBe("added");
    expect(b.kind).toBe("removed");
    expect(c.kind).toBe("unchanged");
  });
});

describe("FlaggedEntity shape", () => {
  it("acepta entity + position + color", () => {
    const f: FlaggedEntity = {
      entity: {
        type: "Company",
        claimed: "FakeCorp",
        original: null,
        severity: "Hard",
        position: 10,
      },
      position: 10,
      color: "hard",
    };
    expect(f.entity.severity).toBe("Hard");
    expect(f.position).toBe(10);
    expect(f.color).toBe("hard");
  });
});

describe("DiffHandoff shape", () => {
  it("acepta originalText + adaptedText + validation + adaptTraceId + timestamp", () => {
    const h: DiffHandoff = {
      originalText: "before",
      adaptedText: "after",
      validation: {
        isValid: false,
        severity: "Critical",
        inventions: [],
        warnings: [],
      },
      adaptTraceId: "0HMVD9F2E5Q2P:00000012",
      timestamp: "2026-06-09T00:00:00.000Z",
    };
    expect(h.originalText).toBe("before");
    expect(h.adaptedText).toBe("after");
    expect(h.adaptTraceId).toBe("0HMVD9F2E5Q2P:00000012");
    expect(h.timestamp).toBeDefined();
  });
});

describe("DiffMode", () => {
  it("solo acepta 'unified' o 'side-by-side'", () => {
    const a: DiffMode = "unified";
    const b: DiffMode = "side-by-side";
    expect(a).toBe("unified");
    expect(b).toBe("side-by-side");
  });
});
