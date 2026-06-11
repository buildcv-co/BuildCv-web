import type { CheckoutSession } from "@/components/wompi/wompi-types";

export class PaymentError extends Error {
  readonly status: number;
  readonly code: string;
  readonly message: string;

  constructor(params: { status: number; code: string; message: string }) {
    super(params.message);
    this.name = "PaymentError";
    this.status = params.status;
    this.code = params.code;
    this.message = params.message;
  }
}

interface ProblemDetails {
  error?: string;
  message?: string;
  title?: string;
  detail?: string;
}

function readProblem(raw: unknown): ProblemDetails {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as ProblemDetails;
}

function isCheckoutSession(value: unknown): value is CheckoutSession {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sessionId === "string" &&
    typeof v.publicKey === "string" &&
    typeof v.amountInCents === "number" &&
    typeof v.currency === "string" &&
    typeof v.reference === "string"
  );
}

export async function requestCheckout(packageId: string): Promise<CheckoutSession> {
  let response: Response;
  try {
    response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId }),
      cache: "no-store",
    });
  } catch {
    throw new PaymentError({
      status: 0,
      code: "PAYMENT_NETWORK",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new PaymentError({
      status: response.status,
      code: "PAYMENT_INVALID_RESPONSE",
      message: "Respuesta inválida del servidor. Intenta de nuevo.",
    });
  }

  if (!response.ok) {
    const problem = readProblem(raw);
    throw new PaymentError({
      status: response.status,
      code: problem.error ?? problem.title ?? "PAYMENT_FAILED",
      message: problem.message ?? problem.detail ?? "No pudimos iniciar el pago. Intenta de nuevo.",
    });
  }

  if (!isCheckoutSession(raw)) {
    throw new PaymentError({
      status: response.status,
      code: "PAYMENT_INVALID_RESPONSE",
      message: "La sesión de pago recibida no es válida. Intenta de nuevo.",
    });
  }

  return raw;
}

export async function fetchPayment(id: string): Promise<unknown> {
  const response = await fetch(`/api/payments/${id}`, { cache: "no-store" });
  if (!response.ok) {
    const problem = readProblem(await response.json().catch(() => ({})));
    throw new PaymentError({
      status: response.status,
      code: problem.error ?? "PAYMENT_FETCH_FAILED",
      message: problem.message ?? "No pudimos obtener el estado del pago.",
    });
  }
  return response.json();
}

export async function listPayments(params?: { page?: number; perPage?: number }): Promise<unknown[]> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.perPage) search.set("perPage", String(params.perPage));
  const qs = search.toString();
  const response = await fetch(qs ? `/api/payments?${qs}` : "/api/payments", { cache: "no-store" });
  if (!response.ok) {
    const problem = readProblem(await response.json().catch(() => ({})));
    throw new PaymentError({
      status: response.status,
      code: problem.error ?? "PAYMENT_LIST_FAILED",
      message: problem.message ?? "No pudimos listar tus pagos.",
    });
  }
  return (await response.json()) as unknown[];
}
