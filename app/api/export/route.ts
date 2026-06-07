import { BACKEND_URL } from "@/lib/api/backend";

// Proxy del blob PDF (QuestPDF, M1). No persiste nada.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${BACKEND_URL}/api/v1/export/pdf`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/pdf",
      "content-disposition":
        res.headers.get("content-disposition") ?? 'attachment; filename="cv.pdf"',
    },
  });
}
