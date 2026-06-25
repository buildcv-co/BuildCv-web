import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
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
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
