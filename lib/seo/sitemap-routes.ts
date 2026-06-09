import type { MetadataRoute } from "next";

export type RouteChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

export interface RouteMetadata {
  readonly path: string;
  readonly changeFrequency: RouteChangeFrequency;
  readonly priority: number;
}

export const PUBLIC_ROUTES: ReadonlyArray<RouteMetadata> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/analizar", changeFrequency: "weekly", priority: 0.9 },
  { path: "/importar", changeFrequency: "monthly", priority: 0.7 },
  { path: "/analizar/editar", changeFrequency: "monthly", priority: 0.6 },
  { path: "/analizar/diff", changeFrequency: "monthly", priority: 0.5 },
  { path: "/analizar/adapt", changeFrequency: "monthly", priority: 0.5 },
  { path: "/analizar/export", changeFrequency: "monthly", priority: 0.5 },
] as const;
