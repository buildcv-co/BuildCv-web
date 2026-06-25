export type CreditReason = "Welcome" | "Purchase" | "Consumption" | "Refund" | "ManualAdjustment";

export type CreditBalance = {
  balance: number;
  recentConsumption: number;
};

export type CreditLedgerEntryDto = {
  id: string;
  userId: string;
  reason: CreditReason;
  reference: string;
  delta: number;
  balanceAfter: number;
  metadata: string | null;
  createdAt: string;
};

export type CreditHistoryPage = {
  entries: CreditLedgerEntryDto[];
  nextCursor: string | null;
};

export class CreditError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(params: { status: number; code: string; message: string }) {
    super(params.message);
    this.name = "CreditError";
    this.status = params.status;
    this.code = params.code;
    this.message = params.message;
  }
}

interface ProblemDetails {
  error?: string;
  code?: string;
  title?: string;
  detail?: string;
  message?: string;
}

function readProblem(raw: unknown): ProblemDetails {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as ProblemDetails;
}

function isBalance(value: unknown): value is CreditBalance {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.balance === "number" && typeof v.recentConsumption === "number";
}

function isHistoryPage(value: unknown): value is CreditHistoryPage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.entries) && (v.nextCursor === null || typeof v.nextCursor === "string");
}

export async function fetchBalance(): Promise<CreditBalance> {
  let response: Response;
  try {
    response = await fetch("/api/credits/balance", { cache: "no-store" });
  } catch {
    throw new CreditError({
      status: 0,
      code: "CREDIT_NETWORK",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new CreditError({
      status: response.status,
      code: "CREDIT_INVALID_RESPONSE",
      message: "Respuesta inválida del servidor. Intenta de nuevo.",
    });
  }

  if (!response.ok) {
    const problem = readProblem(raw);
    throw new CreditError({
      status: response.status,
      code: problem.code ?? problem.error ?? "CREDIT_FETCH_FAILED",
      message: problem.message ?? problem.detail ?? "No pudimos obtener tu saldo de créditos.",
    });
  }

  if (!isBalance(raw)) {
    throw new CreditError({
      status: response.status,
      code: "CREDIT_INVALID_RESPONSE",
      message: "La respuesta del servidor no es válida. Intenta de nuevo.",
    });
  }

  return raw;
}

export async function fetchHistory(params?: { limit?: number; cursor?: string }): Promise<CreditHistoryPage> {
  const url = new URL("/api/credits/history", window.location.origin);
  if (params?.limit) {
    url.searchParams.set("limit", String(params.limit));
  }
  if (params?.cursor) {
    url.searchParams.set("cursor", params.cursor);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { cache: "no-store" });
  } catch {
    throw new CreditError({
      status: 0,
      code: "CREDIT_NETWORK",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new CreditError({
      status: response.status,
      code: "CREDIT_INVALID_RESPONSE",
      message: "Respuesta inválida del servidor. Intenta de nuevo.",
    });
  }

  if (!response.ok) {
    const problem = readProblem(raw);
    throw new CreditError({
      status: response.status,
      code: problem.code ?? problem.error ?? "CREDIT_HISTORY_FAILED",
      message: problem.message ?? problem.detail ?? "No pudimos obtener tu historial de créditos.",
    });
  }

  if (!isHistoryPage(raw)) {
    throw new CreditError({
      status: response.status,
      code: "CREDIT_INVALID_RESPONSE",
      message: "La respuesta del servidor no es válida. Intenta de nuevo.",
    });
  }

  return raw;
}
