import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health/ready`, { cache: "no-store" });
    const text = (await res.text()).trim();
    return NextResponse.json(
      { ok: res.ok, backendStatus: res.status, backend: text || null },
      { status: res.ok ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { ok: false, backendStatus: null, backend: null, error: "No se pudo contactar al backend." },
      { status: 503 },
    );
  }
}
