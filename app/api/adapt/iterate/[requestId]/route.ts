import { NextResponse } from "next/server";
import { getJwtFromSession } from "@/lib/api/jwt";
import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const session = await getJwtFromSession();
  if (!session) {
    return NextResponse.json(
      { error: "AUTH/UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { requestId } = await context.params;

  const upstream = await fetch(
    `${BACKEND_URL}/api/v1/adapt/iterate/${requestId}`,
    {
      headers: { authorization: `Bearer ${session.jwt}` },
      cache: "no-store",
    },
  );

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });
}