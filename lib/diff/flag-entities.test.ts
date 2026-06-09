import { describe, it, expect } from "vitest";
import { flagEntitiesInDiff } from "./flag-entities";
import type { DiffChange } from "./types";
import type { EntityInvention } from "@/lib/api/types";

function inv(over: Partial<EntityInvention>): EntityInvention {
  return {
    type: "Company",
    claimed: "FakeCorp",
    original: null,
    severity: "Hard",
    position: 0,
    ...over,
  };
}

describe("flagEntitiesInDiff", () => {
  it("invención Soft cuya position cae dentro de un segmento unchanged → marcada soft", () => {
    const diff: DiffChange[] = [
      { kind: "unchanged", value: "Hello world" }, // offsets 0..11
      { kind: "added", value: "!" },
    ];
    const inventions: EntityInvention[] = [
      inv({ type: "Metric", claimed: "40%", original: "35%", severity: "Soft", position: 6 }),
    ];
    const result = flagEntitiesInDiff(diff, inventions);
    const seg0 = result.segments[0]!;
    expect(seg0).toBeDefined();
    expect(seg0.flags).toHaveLength(1);
    expect(seg0.flags[0]!.color).toBe("soft");
  });

  it("invención Hard en la misma posición que una Soft → Hard sobrescribe a Soft", () => {
    const diff: DiffChange[] = [
      { kind: "added", value: "FakeCorp" },
    ];
    const inventions: EntityInvention[] = [
      inv({ type: "Company", claimed: "FakeCorp", original: null, severity: "Soft", position: 0 }),
      inv({ type: "Company", claimed: "FakeCorp", original: null, severity: "Hard", position: 0 }),
    ];
    const result = flagEntitiesInDiff(diff, inventions);
    expect(result.segments[0]!.flags).toHaveLength(1);
    expect(result.segments[0]!.flags[0]!.color).toBe("hard");
    expect(result.segments[0]!.flags[0]!.entity.severity).toBe("Hard");
  });

  it("invención cuya position no cae en ningún segmento (huérfana) → no se marca, pero queda en orphanedFlags", () => {
    const diff: DiffChange[] = [
      { kind: "unchanged", value: "abc" }, // offsets 0..3
    ];
    const inventions: EntityInvention[] = [inv({ position: 100 })];
    const result = flagEntitiesInDiff(diff, inventions);
    expect(result.segments[0]!.flags).toHaveLength(0);
    expect(result.orphanedFlags).toHaveLength(1);
    expect(result.orphanedFlags[0]!.position).toBe(100);
  });

  it("invención en un segmento 'removed' → no se asigna a ese segmento, queda huérfana", () => {
    const diff: DiffChange[] = [
      { kind: "removed", value: "world" }, // offsets 0..5
    ];
    const inventions: EntityInvention[] = [inv({ claimed: "world", position: 0 })];
    const result = flagEntitiesInDiff(diff, inventions);
    expect(result.segments[0]!.flags).toHaveLength(0);
    expect(result.orphanedFlags).toHaveLength(1);
  });

  it("asigna offset startOffset/endOffset a cada segmento (acumulativo)", () => {
    const result = flagEntitiesInDiff(
      [
        { kind: "unchanged", value: "ab" },
        { kind: "added", value: "cde" },
        { kind: "unchanged", value: "f" },
      ],
      [],
    );
    expect(result.segments[0]!.startOffset).toBe(0);
    expect(result.segments[0]!.endOffset).toBe(2);
    expect(result.segments[1]!.startOffset).toBe(2);
    expect(result.segments[1]!.endOffset).toBe(5);
    expect(result.segments[2]!.startOffset).toBe(5);
    expect(result.segments[2]!.endOffset).toBe(6);
  });

  it("dos invenciones en el mismo segmento → ambas se asignan", () => {
    const result = flagEntitiesInDiff(
      [{ kind: "unchanged", value: "Hello world" }],
      [
        inv({ claimed: "Hello", position: 0, severity: "Soft" }),
        inv({ claimed: "world", position: 6, severity: "Soft" }),
      ],
    );
    expect(result.segments[0]!.flags).toHaveLength(2);
  });

  it("el campo entity del FlaggedEntity es la EntityInvention original", () => {
    const entity = inv({ claimed: "Senior", severity: "Hard", position: 0 });
    const result = flagEntitiesInDiff(
      [{ kind: "added", value: "Senior" }],
      [entity],
    );
    expect(result.segments[0]!.flags[0]!.entity).toEqual(entity);
  });

  it("invención con position negativa → huérfana (defensivo)", () => {
    const result = flagEntitiesInDiff(
      [{ kind: "added", value: "x" }],
      [inv({ position: -1 })],
    );
    expect(result.segments[0]!.flags).toHaveLength(0);
    expect(result.orphanedFlags).toHaveLength(1);
  });

  it("diff vacío + inventions vacías → { segments: [], orphanedFlags: [] }", () => {
    const result = flagEntitiesInDiff([], []);
    expect(result.segments).toHaveLength(0);
    expect(result.orphanedFlags).toHaveLength(0);
  });

  it("devuelve DiffSegmentWithFlags[] con shape estable", () => {
    const result = flagEntitiesInDiff(
      [{ kind: "unchanged", value: "hi" }],
      [],
    );
    for (const seg of result.segments) {
      expect(Object.keys(seg).sort()).toEqual(
        ["endOffset", "flags", "kind", "startOffset", "value"].sort(),
      );
    }
  });
});
