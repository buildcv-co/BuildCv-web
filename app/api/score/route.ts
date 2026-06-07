import { BACKEND_URL } from "@/lib/api/backend";

// Proxy JSON hacia el backend. El motor de puntaje (determinista) llega en M1.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${BACKEND_URL}/api/v1/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
