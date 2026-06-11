import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === "host") continue;
    if (key.toLowerCase() === "content-length") continue;
    headers.set(key, value);
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/payments/webhook`, {
    method: "POST",
    headers,
    body: rawBody,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
