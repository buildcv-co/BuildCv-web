export class EntityNotAllowedError extends Error {
  readonly entityValue: string;
  readonly sectionKind: string;

  constructor(entityValue: string, sectionKind: string) {
    super(
      `ENTITY_NOT_ALLOWED: "${entityValue}" en sección ${sectionKind} no fue tipeado por el usuario y no está en el CV importado.`,
    );
    this.name = "EntityNotAllowedError";
    this.entityValue = entityValue;
    this.sectionKind = sectionKind;
  }
}

export class SectionValidationFailedError extends Error {
  readonly sectionKind: string;
  readonly issues: ReadonlyArray<{ path: string; message: string }>;

  constructor(
    sectionKind: string,
    issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(`SECTION_VALIDATION_FAILED: ${sectionKind} no pasó validación Zod.`);
    this.name = "SectionValidationFailedError";
    this.sectionKind = sectionKind;
    this.issues = issues;
  }
}

export class RoundTripMismatchError extends Error {
  readonly details: string;

  constructor(details: string) {
    super(`ROUNDTRIP_MISMATCH: ${details}`);
    this.name = "RoundTripMismatchError";
    this.details = details;
  }
}
