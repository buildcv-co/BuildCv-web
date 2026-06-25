import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getJwtFromSession();
  if (!session) {
    return NextResponse.json(
      { error: "AUTH/UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "50";
  const cursor = searchParams.get("cursor") ?? "";

  const backendUrl = new URL(`${BACKEND_URL}/api/v1/credits/history`);
  backendUrl.searchParams.set("limit", limit);
  if (cursor) {
    backendUrl.searchParams.set("cursor", cursor);
  }

  const upstream = await fetch(backendUrl.toString(), {
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
