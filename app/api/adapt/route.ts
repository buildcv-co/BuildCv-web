import { BACKEND_URL } from "@/lib/api/backend";

// BFF: proxyea al endpoint /api/v1/adapt del backend .NET.
// El browser NUNCA habla directo con el backend (Constitution Art. VI — Clean Arch).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/adapt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
