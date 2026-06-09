import { NextResponse } from "next/server";
import { z } from "zod";
import { logStore } from "@/lib/observability/log-store";
import type { LogEntry } from "@/lib/observability/types";

/**
 * BFF opcional `/api/log` — recibe logs de errores del cliente y los
 * persiste en memoria (NO disco, NO DB). Default OFF: el cliente
 * debe llamar `enableBffLogging()` para activar el POST.
 *
 * Privacy by design (Constitution Art. III). Stack máximo 100.
 *
 * Spec: 008-web-observability-web · FR-090, FR-091, NFR-045.
 */

export const dynamic = "force-dynamic";

function isLogEndpointEnabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env["BUILDCV_LOG_ENDPOINT"] === "enabled"
  );
}

const LogContextSchema = z.object({
  url: z.string().min(1).max(2048),
  userAgent: z.string().max(500),
  viewport: z.object({
    width: z.number().int().min(0).max(10000),
    height: z.number().int().min(0).max(10000),
  }),
  appVersion: z.string().max(50),
  buildSha: z.string().max(50),
  locale: z.string().max(20),
});

const LogEntrySchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  level: z.enum(["error", "warning", "info"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(10_000).optional(),
  context: LogContextSchema,
  componentStack: z.string().max(10_000).optional(),
  dedupeKey: z.string().max(500).optional(),
  dedupeCount: z.number().int().min(1).max(1000).optional(),
});

export async function POST(request: Request): Promise<Response> {
  if (!isLogEndpointEnabled()) {
    return NextResponse.json(
      { error: "Logging endpoint disabled" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = LogEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const entry: LogEntry = parsed.data;
  logStore.add(entry);
  return new NextResponse(null, { status: 204 });
}

export async function GET(): Promise<Response> {
  if (!isLogEndpointEnabled()) {
    return NextResponse.json(
      { error: "Logging endpoint disabled" },
      { status: 503 },
    );
  }
  return NextResponse.json(logStore.getAll());
}
