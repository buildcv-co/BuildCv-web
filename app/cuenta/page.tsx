import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserData,
  RateLimitError,
  UserDataError,
  type UserDataResponse,
} from "@/lib/api/user-data";
import { copy } from "@/lib/copy/es";
import { CuentaSkeleton } from "@/components/account/cuenta-skeleton";
import { DatosPersonalesSection } from "@/components/account/datos-personales-section";
import { ConsentSectionSlot } from "@/components/account/consent-section-slot";
import { ArcoSectionSlot } from "@/components/account/arco-section-slot";

/**
 * Página `/cuenta` — server component (009-auth-web PR4).
 *
 * Spec: REQ-FN-010 + REQ-FN-011 + REQ-FN-018 + CR-PRIV-1.
 *
 * Comportamiento:
 *  - Sin sesión NextAuth → `redirect('/auth/signin?callbackUrl=/cuenta')`
 *    (NFR-RES-1: no loop infinito).
 *  - Con sesión → render del `<CuentaSkeleton>` con 3 secciones estables:
 *      1. `<DatosPersonalesSection>` (PR4) — email/provider/createdAt/lastLoginAt.
 *      2. `<ConsentSectionSlot>` (PR4) — placeholder, PR5 inyecta `<ConsentPanel>`.
 *      3. `<ArcoSectionSlot>` (PR4) — placeholder, PR6 inyecta `<ArcoPanel>`.
 *  - Si `getUserData` lanza `RateLimitError` → banner inline con copy
 *    rate-limit + fecha formateada del `Retry-After` (REQ-FN-018, NFR-RATE-1).
 *  - Si `getUserData` lanza otro error → banner genérico.
 *
 * Constitution:
 *  - **Art. III** + **NFR-OBS-1**: NO loguea email/name. Banner genérico
 *    en errores. Footer disclaimer del backend in-memory (CR-PRIV-1).
 *  - **Art. VI** + **CR-TOK-1**: NO expone tokens al cliente; los datos
 *    vienen del backend vía el BFF `app/api/user/data/route.ts` (no
 *    directo).
 *  - **R2**: slot structure estable; PR5 y PR6 cada una toca un slot
 *    distinto, no colisionan.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SessionWithId = { user?: { id?: string } };

async function loadUserData(): Promise<{
  userData: UserDataResponse | null;
  error: Error | null;
}> {
  try {
    const userData = await getUserData();
    return { userData, error: null };
  } catch (err) {
    if (err instanceof RateLimitError || err instanceof UserDataError || err instanceof Error) {
      return { userData: null, error: err };
    }
    return { userData: null, error: new Error("Unknown error") };
  }
}

export default async function CuentaPage(): Promise<React.ReactElement> {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/cuenta");
  }

  const { userData, error } = await loadUserData();

  return (
    <CuentaSkeleton
      title={copy.account.title}
      inMemoryNotice={copy.account.inMemoryNotice}
      datosPersonales={
        <DatosPersonalesSection userData={userData} error={error ?? undefined} />
      }
      consent={
        <ConsentSectionSlot
          title={copy.account.consentSlot.title}
          placeholderMessage={copy.account.consentSlot.placeholderMessage}
        />
      }
      arco={
        <ArcoSectionSlot
          title={copy.account.arcoSlot.title}
          placeholderMessage={copy.account.arcoSlot.placeholderMessage}
        />
      }
    />
  );
}