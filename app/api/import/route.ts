import { BACKEND_URL } from "@/lib/api/backend";

// BFF: proxyea el multipart/form-data al endpoint /api/v1/import del backend .NET.
// El browser NUNCA habla directo con el backend (Constitution Art. VI — Clean Arch).
// Runtime nodejs: necesario para multipart > 4 MB (edge runtime trunca a 4 MB).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();

  const upstream = await fetch(`${BACKEND_URL}/api/v1/import`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
