/**
 * Migración de localStorage para PR 4b (bridge entre editor legacy 1.0.0 y
 * editor JSON Resume 2.0.0).
 *
 * Cuando el usuario carga un draft viejo (`buildcv:draft:*` con shape
 * `LegacyCvDocument`), `migrateLegacyLocalStorage()`:
 *   1. Detecta la key vieja (shape con `sections[]` y `entities[]`).
 *   2. La convierte vía `migrateLegacyToJsonResume()` → `CvDocument` JSON
 *      Resume con `confidence: 'inferred'` en todos los campos.
 *   3. La persiste bajo la nueva key (`buildcv:draft:*-v2`) y borra la vieja.
 *
 * Constitución Art. III: no persistimos datos del usuario en servidores —
 * esta migración es local-only (browser localStorage). Si falla (storage
 * lleno, JSON inválido), se ignora silenciosamente y la key vieja queda
 * intacta para retry.
 *
 * Constitución Art. I: la fuente legacy es plain-text (markdown), nunca
 * confirmación del usuario. Los campos se migran como `confidence:
 * 'inferred'` — el editor (PR 4d) promoverá a `'user_confirmed'` solo en
 * blur.
 */
import { migrateLegacyToJsonResume } from "@/lib/editor/types";
import type {
  CvDocument,
  LegacyCvDocument,
} from "@/lib/editor/types";

const DRAFT_PREFIX = "buildcv:draft:";
const V2_SUFFIX = "-v2";

/**
 * Migra un valor legacy (raw JSON de localStorage) a `CvDocument` JSON
 * Resume. Devuelve `null` si el valor NO es legacy (ya está migrado o no
 * calza con el shape `LegacyCvDocument`).
 *
 * Detección legacy: el objeto debe tener `sections: Array` y `entities:
 * Array` en su raíz (campos únicos del shape viejo).
 */
export function tryMigrateLegacyDraft(
  raw: unknown,
): CvDocument | null {
  if (!isLegacyShape(raw)) return null;
  return migrateLegacyToJsonResume(raw as LegacyCvDocument);
}

/**
 * Recorre todas las keys de localStorage con prefijo `buildcv:draft:` que
 * contengan un `LegacyCvDocument` y las migra in-place a `CvDocument` JSON
 * Resume bajo la misma id con sufijo `-v2`. Keys ya migradas o con shape
 * desconocido se dejan intactas.
 *
 * Devuelve el número de keys migradas. Retorna `0` si localStorage no está
 * disponible (SSR / browser sin storage).
 */
export function migrateLegacyLocalStorage(): number {
  if (typeof localStorage === "undefined") return 0;

  let migrated = 0;
  const toRemove: string[] = [];
  const toWrite: Array<{ key: string; value: string }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null || !key.startsWith(DRAFT_PREFIX)) continue;
    if (key.endsWith(V2_SUFFIX)) continue;

    const raw = localStorage.getItem(key);
    if (raw === null) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON inválido — lo dejamos intacto
      continue;
    }

    const migratedDoc = tryMigrateLegacyDraft(parsed);
    if (migratedDoc === null) continue;

    const id = key.slice(DRAFT_PREFIX.length);
    const newKey = `${DRAFT_PREFIX}${id}${V2_SUFFIX}`;
    toWrite.push({ key: newKey, value: JSON.stringify(migratedDoc) });
    toRemove.push(key);
    migrated++;
  }

  for (const { key, value } of toWrite) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // quota / serialización — abortamos silenciosamente
      return migrated - 1;
    }
  }
  for (const key of toRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  return migrated;
}

function isLegacyShape(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.sections) && Array.isArray(obj.entities);
}
