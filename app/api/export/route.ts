import { BACKEND_URL } from "@/lib/api/backend";

// BFF: proxy del PDF binario. El browser NUNCA habla directo con el backend
// (Constitution Art. VI — Clean Arch, BFF same-origin).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/export`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/pdf",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="cv.pdf"',
    },
  });
}
