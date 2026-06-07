/**
 * URL del backend .NET que los Route Handlers (BFF) consumen server-to-server.
 * El navegador nunca habla con el backend directamente: siempre pasa por el BFF
 * de Next.js (same-origin), que oculta el backend y propaga cabeceras.
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";
