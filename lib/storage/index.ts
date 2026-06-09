import type { CvDocument } from "@/lib/editor/types";
import { LocalStorageCvStore, type ICvStore } from "./icv-store";

const ISO_EPOCH = new Date(0).toISOString();

export const BLANK_DOCUMENT: CvDocument = {
  id: "blank",
  version: "0.5.0",
  locale: "es-CO",
  sections: [],
  entities: [],
  createdAt: ISO_EPOCH,
  updatedAt: ISO_EPOCH,
  source: "blank",
};

let cached: ICvStore | null = null;

export async function getCvStore(): Promise<ICvStore> {
  if (cached) return cached;
  const candidate = new LocalStorageCvStore();
  if (isLocalStorageAvailable()) {
    cached = candidate;
    return cached;
  }
  throw new Error("LocalStorage unavailable");
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const probe = "__buildcv_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
