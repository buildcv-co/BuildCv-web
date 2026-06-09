import { describe, it, expect } from "vitest";
import { copy } from "./es";

describe("copy.export", () => {
  it("es un objeto con button/buttonLoading/filenameHint/success/errors/retry", () => {
    expect(typeof copy.export).toBe("object");
    expect(copy.export).not.toBeNull();
  });

  it("button y buttonLoading existen", () => {
    expect(typeof copy.export.button).toBe("string");
    expect(typeof copy.export.buttonLoading).toBe("string");
  });

  it("filenameHint usa el patrón cv-adapted-{date}.pdf", () => {
    expect(typeof copy.export.filenameHint).toBe("string");
    expect(copy.export.filenameHint).toMatch(/^cv-adapted-\{date\}\.pdf$/);
  });

  it("success existe (post-click feedback)", () => {
    expect(typeof copy.export.success).toBe("string");
  });

  it("errors: rateLimit/blocked/unavailable/network/generic existen", () => {
    expect(typeof copy.export.errors.rateLimit).toBe("string");
    expect(typeof copy.export.errors.blocked).toBe("string");
    expect(typeof copy.export.errors.unavailable).toBe("string");
    expect(typeof copy.export.errors.network).toBe("string");
    expect(typeof copy.export.errors.generic).toBe("string");
  });

  it("rateLimit es honesto y menciona el tope '20/hora' (Constitution Art. VII)", () => {
    expect(copy.export.errors.rateLimit).toMatch(/20\/hora/);
    expect(copy.export.errors.rateLimit.toLowerCase()).toContain("exportaciones");
  });

  it("blocked menciona 'invenciones' y 'regenerar' (Art. I, hard inventions)", () => {
    expect(copy.export.errors.blocked.toLowerCase()).toContain("invenciones");
    expect(copy.export.errors.blocked.toLowerCase()).toContain("regenera");
  });

  it("retry existe (usado en 503)", () => {
    expect(typeof copy.export.retry).toBe("string");
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.export).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
      /cv\s+optimizado/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});

describe("copy.adapt", () => {
  it("es un objeto con bloques panel/severity/errors/delta/cta", () => {
    expect(typeof copy.adapt).toBe("object");
    expect(copy.adapt).not.toBeNull();
  });

  it("panel: title, description, button, buttonLoading existen", () => {
    expect(typeof copy.adapt.panel.title).toBe("string");
    expect(typeof copy.adapt.panel.description).toBe("string");
    expect(typeof copy.adapt.panel.button).toBe("string");
    expect(typeof copy.adapt.panel.buttonLoading).toBe("string");
  });

  it("severity: none/warning/critical existen y son strings", () => {
    expect(typeof copy.adapt.severity.none).toBe("string");
    expect(typeof copy.adapt.severity.warning).toBe("string");
    expect(typeof copy.adapt.severity.critical).toBe("string");
  });

  it("severity.none menciona descarga lista (Art. I honest framing)", () => {
    expect(copy.adapt.severity.none.toLowerCase()).toContain("lista");
  });

  it("errors: rateLimit/blocked/unavailable/generic/network existen", () => {
    expect(typeof copy.adapt.errors.rateLimit).toBe("string");
    expect(typeof copy.adapt.errors.blocked).toBe("string");
    expect(typeof copy.adapt.errors.unavailable).toBe("string");
    expect(typeof copy.adapt.errors.generic).toBe("string");
    expect(typeof copy.adapt.errors.network).toBe("string");
  });

  it("delta: title, empty, hardLabel, softLabel existen", () => {
    expect(typeof copy.adapt.delta.title).toBe("string");
    expect(typeof copy.adapt.delta.empty).toBe("string");
    expect(typeof copy.adapt.delta.hardLabel).toBe("string");
    expect(typeof copy.adapt.delta.softLabel).toBe("string");
  });

  it("cta.regenerate existe (usado en 422)", () => {
    expect(typeof copy.adapt.cta.regenerate).toBe("string");
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.adapt).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});

// =====================================================================
// 005-web-cv-import-ui — copy.import
// =====================================================================

describe("copy.import", () => {
  it("es un objeto con bloques page/states/buttonUseInEditor/handoffHint/errors", () => {
    expect(typeof copy.import).toBe("object");
    expect(copy.import).not.toBeNull();
  });

  it("page: title, subtitle, maxSize, dragHere, or, clickToSelect existen", () => {
    expect(typeof copy.import.page.title).toBe("string");
    expect(typeof copy.import.page.subtitle).toBe("string");
    expect(typeof copy.import.page.maxSize).toBe("string");
    expect(typeof copy.import.page.dragHere).toBe("string");
    expect(typeof copy.import.page.or).toBe("string");
    expect(typeof copy.import.page.clickToSelect).toBe("string");
  });

  it("page.maxSize menciona '5 MB' (encuadre honesto del límite)", () => {
    expect(copy.import.page.maxSize).toContain("5 MB");
  });

  it("states: idle/loading/success/error existen", () => {
    expect(typeof copy.import.states.idle).toBe("string");
    expect(typeof copy.import.states.loading).toBe("string");
    expect(typeof copy.import.states.success).toBe("string");
    expect(typeof copy.import.states.error).toBe("string");
  });

  it("buttonUseInEditor es el label del handoff al editor (006)", () => {
    expect(typeof copy.import.buttonUseInEditor).toBe("string");
    expect(copy.import.buttonUseInEditor.length).toBeGreaterThan(0);
  });

  it("handoffHint existe (cuando 006 no está implementado)", () => {
    expect(typeof copy.import.handoffHint).toBe("string");
    expect(copy.import.handoffHint.toLowerCase()).toContain("próximamente");
  });

  it("sections: title + confidenceHigh + confidenceLow existen", () => {
    expect(typeof copy.import.sections.title).toBe("string");
    expect(typeof copy.import.sections.confidenceHigh).toBe("string");
    expect(typeof copy.import.sections.confidenceLow).toBe("string");
  });

  it("sections.empty: texto cuando no hay secciones detectadas", () => {
    expect(typeof copy.import.sections.empty).toBe("string");
  });

  it("warnings: title + close + empty existen", () => {
    expect(typeof copy.import.warnings.title).toBe("string");
    expect(typeof copy.import.warnings.close).toBe("string");
    expect(typeof copy.import.warnings.empty).toBe("string");
  });

  it("errors: los 8 kinds tienen mensaje en español", () => {
    expect(typeof copy.import.errors.network).toBe("string");
    expect(typeof copy.import.errors.clientValidation).toBe("string");
    expect(typeof copy.import.errors.tooLarge).toBe("string");
    expect(typeof copy.import.errors.unsupportedMime).toBe("string");
    expect(typeof copy.import.errors.validation).toBe("string");
    expect(typeof copy.import.errors.engine).toBe("string");
    expect(typeof copy.import.errors.rateLimit).toBe("string");
    expect(typeof copy.import.errors.unknown).toBe("string");
  });

  it("errors.rateLimit es honesto y menciona el tope '30/hora' (Constitution Art. VII)", () => {
    expect(copy.import.errors.rateLimit).toMatch(/30\/hora/);
    expect(copy.import.errors.rateLimit.toLowerCase()).toContain("importaciones");
  });

  it("errors.tooLarge menciona '5 MB' (consistencia con backend contract)", () => {
    expect(copy.import.errors.tooLarge).toContain("5 MB");
  });

  it("errors.unsupportedMime dice 'PDF o DOCX' (encuadre honesto del tipo aceptado)", () => {
    expect(copy.import.errors.unsupportedMime).toMatch(/PDF o DOCX/);
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.import).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
      /convertir\s+a\s+formato\s+ats/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});

// =====================================================================
// 006-web-cv-editor — copy.editor
// =====================================================================

describe("copy.editor", () => {
  it("es un objeto con bloques page/toolbar/sections/placeholders/confirm/toasts/errors", () => {
    expect(typeof copy.editor).toBe("object");
    expect(copy.editor).not.toBeNull();
  });

  it("page: title + subtitle + noHandoff existen", () => {
    expect(typeof copy.editor.page.title).toBe("string");
    expect(typeof copy.editor.page.subtitle).toBe("string");
    expect(typeof copy.editor.page.noHandoff).toBe("string");
  });

  it("page.title es 'Editar tu borrador' (Constitution Art. IV — encuadre honesto)", () => {
    expect(copy.editor.page.title.toLowerCase()).toContain("editar");
    expect(copy.editor.page.title.toLowerCase()).toContain("borrador");
  });

  it("toolbar: save + saved + saving + dirty + rescore + rescoreLoading + exportMd + clear existen", () => {
    expect(typeof copy.editor.toolbar.save).toBe("string");
    expect(typeof copy.editor.toolbar.saved).toBe("string");
    expect(typeof copy.editor.toolbar.saving).toBe("string");
    expect(typeof copy.editor.toolbar.dirty).toBe("string");
    expect(typeof copy.editor.toolbar.rescore).toBe("string");
    expect(typeof copy.editor.toolbar.rescoreLoading).toBe("string");
    expect(typeof copy.editor.toolbar.exportMd).toBe("string");
    expect(typeof copy.editor.toolbar.clear).toBe("string");
  });

  it("sections: 8 nombres en español", () => {
    expect(copy.editor.sections.profile).toBeTypeOf("string");
    expect(copy.editor.sections.experience).toBeTypeOf("string");
    expect(copy.editor.sections.education).toBeTypeOf("string");
    expect(copy.editor.sections.skills).toBeTypeOf("string");
    expect(copy.editor.sections.projects).toBeTypeOf("string");
    expect(copy.editor.sections.certifications).toBeTypeOf("string");
    expect(copy.editor.sections.languages).toBeTypeOf("string");
    expect(copy.editor.sections.other).toBeTypeOf("string");
  });

  it("placeholders tiene entrada para cada field de las 8 sections", () => {
    const p = copy.editor.placeholders;
    expect(p.profileFullName).toBeTypeOf("string");
    expect(p.profileHeadline).toBeTypeOf("string");
    expect(p.profileEmail).toBeTypeOf("string");
    expect(p.experienceRole).toBeTypeOf("string");
    expect(p.experienceCompany).toBeTypeOf("string");
    expect(p.educationDegree).toBeTypeOf("string");
    expect(p.skillsCategory).toBeTypeOf("string");
    expect(p.projectName).toBeTypeOf("string");
    expect(p.certificationName).toBeTypeOf("string");
    expect(p.languageName).toBeTypeOf("string");
    expect(p.otherTitle).toBeTypeOf("string");
  });

  it("confirm.clearDraft: title + detail + cancel + confirm existen", () => {
    const c = copy.editor.confirm.clearDraft;
    expect(c.title).toBeTypeOf("string");
    expect(c.detail).toBeTypeOf("string");
    expect(c.cancel).toBeTypeOf("string");
    expect(c.confirm).toBeTypeOf("string");
  });

  it("confirm.clearDraft.title menciona 'borrador' (Constitution Art. III FR-040b)", () => {
    expect(copy.editor.confirm.clearDraft.title.toLowerCase()).toContain("borrador");
  });

  it("toasts: saved + cleared + rescoreSuccess + rescoreFailed + exported existen", () => {
    expect(typeof copy.editor.toasts.saved).toBe("string");
    expect(typeof copy.editor.toasts.cleared).toBe("string");
    expect(typeof copy.editor.toasts.rescoreSuccess).toBe("string");
    expect(typeof copy.editor.toasts.rescoreFailed).toBe("string");
    expect(typeof copy.editor.toasts.exported).toBe("string");
  });

  it("errors: network + storage + validation + jobTextRequired existen", () => {
    expect(typeof copy.editor.errors.network).toBe("string");
    expect(typeof copy.editor.errors.storage).toBe("string");
    expect(typeof copy.editor.errors.validation).toBe("string");
    expect(typeof copy.editor.errors.jobTextRequired).toBe("string");
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.editor).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
      /mejorar.*automaticamente/,
      /cv\s+optimizado/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});
