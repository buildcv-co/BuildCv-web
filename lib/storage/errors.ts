export class QuotaExceededError extends Error {
  readonly bytesRequested: number;
  readonly bytesAvailable: number;

  constructor(bytesRequested: number, bytesAvailable: number) {
    super(
      `Storage quota exceeded: requested ${bytesRequested} bytes, available ${bytesAvailable} bytes.`,
    );
    this.name = "QuotaExceededError";
    this.bytesRequested = bytesRequested;
    this.bytesAvailable = bytesAvailable;
  }
}

export class StorageUnavailableError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`Storage unavailable: ${reason}`);
    this.name = "StorageUnavailableError";
    this.reason = reason;
  }
}

export class DraftNotFoundError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`Draft not found: ${id}`);
    this.name = "DraftNotFoundError";
    this.id = id;
  }
}
