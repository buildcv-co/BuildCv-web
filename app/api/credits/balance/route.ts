import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await getJwtFromSession();
  if (!session) {
    return NextResponse.json(
      { error: "AUTH/UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/credits/balance`, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.jwt}` },
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
