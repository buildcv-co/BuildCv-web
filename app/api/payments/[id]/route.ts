import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getJwtFromSession();
  if (!session) {
    return NextResponse.json(
      { error: "AUTH/UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const path = query
    ? `${BACKEND_URL}/api/v1/payments/${id}?${query}`
    : `${BACKEND_URL}/api/v1/payments/${id}`;

  const upstream = await fetch(path, {
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
