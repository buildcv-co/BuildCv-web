import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getJwtFromSession();
  if (!session) {
    return NextResponse.json(
      { error: "AUTH/UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const body = await request.text();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/payments/checkout`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${session.jwt}`,
    },
    body,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
