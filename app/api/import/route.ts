import { BACKEND_URL } from "@/lib/api/backend";

// BFF: proxyea el multipart/form-data al endpoint /api/v1/import del backend .NET.
// El browser NUNCA habla directo con el backend (Constitution Art. VI — Clean Arch).
// Runtime nodejs: necesario para multipart > 4 MB (edge runtime trunca a 4 MB).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Header de negociación de versión del motor de import (PR 2e de 021).
 * El browser lo envía (configurado en `lib/api/import.ts`) y el BFF lo
 * reenvía transparente al backend. Si el browser omite el header, el backend
 * aplica su default (v2.0.0). Mantener este constante sincronizado con
 * `lib/api/import.ts#ENGINE_VERSION_HEADER`.
 */
const ENGINE_VERSION_HEADER = "X-Engine-Version";

export async function POST(request: Request) {
  const formData = await request.formData();

  const headers: Record<string, string> = {};
  const engineVersion = request.headers.get(ENGINE_VERSION_HEADER);
  if (engineVersion) {
    headers[ENGINE_VERSION_HEADER] = engineVersion;
  }

  const upstream = await fetch(`${BACKEND_URL}/api/v1/import`, {
    method: "POST",
    body: formData,
    cache: "no-store",
    headers,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
