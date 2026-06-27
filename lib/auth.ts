import type { NextAuthOptions, Account, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { registerWithBackend } from "@/lib/api/auth-adapter";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";

export const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_USER_EMAIL = "local@buildcv.dev";
export const LOCAL_USER_NAME = "Local User";

export const NEXT_AUTH_ISSUER = process.env.NEXTAUTH_ISSUER ?? "buildcv-web";
export const NEXT_AUTH_AUDIENCE = process.env.NEXTAUTH_AUDIENCE ?? "buildcv-api";

type UserWithBackendId = { backendUserId?: string };
type SessionWithId = { user: { id?: string } };

type SignInEventParams = {
  user: { email?: string | null; name?: string | null };
  account: Account | null;
  profile?: Profile;
  isNewUser?: boolean;
};

/**
 * Hook `events.signIn` — reemplaza el callback obsoleto que POSTeaba al
 * endpoint legacy con contrato drift (PR0 backend introdujo el endpoint
 * canónico `/api/v1/auth/web-signup`, PR1 web fija el adapter).
 *
 * Hoy delega a `registerWithBackend` que habla con el endpoint canónico
 * shippeado por PR0 backend y se autentica vía header `X-BFF-Key`.
 *
 * Si el adapter falla con 5xx o error de red: NO bloqueamos el inicio de
 * sesión (R1-A) — logueamos `console.warn` (Art. III, sin PII) y dejamos
 * que NextAuth proceda. El usuario verá `/cuenta` y un eventual 401 al
 * primer GET protegido se resolverá reintentando vía PR2.
 *
 * MINOR-1 (fresh review PR1): si el profile OAuth viene SIN `name` (p.ej.
 * cuentas de Google sin display name público), el adapter POSTearía
 * `{name: ""}` al backend, que responde 400 (`name` required per
 * `WebSignupHandler.cs:30-33`), y el hook se lo traga silenciosamente.
 * Constitution Art. I (cero invención) prohíbe inventar el nombre desde
 * el local-part del email; Constitution Art. III (privacidad) prefiere
 * NO enviar PII derivada. Por tanto: si `name` está vacío, NO llamamos
 * al adapter (sería un 400 garantizado), emitimos `console.warn`
 * explícito (Art. III honest-signal, sin PII), y dejamos que NextAuth
 * proceda (R1-A best-effort). El siguiente GET protegido en `/cuenta`
 * resolverá vía PR2.
 */
export async function handleSignInEvent(params: SignInEventParams): Promise<void> {
  const provider = params.account?.provider;
  const providerAccountId = params.account?.providerAccountId;
  const email = params.user?.email;
  const name = params.user?.name ?? "";

  if (!provider || !providerAccountId || !email) return;

  if (provider !== "google" && provider !== "linkedin") return;

  if (!name) {
    console.warn(
      "[auth/events.signIn] skipping web-signup: provider profile missing required `name` field (MINOR-1 fix; per Constitution Art. I we do NOT invent the name from email local-part)",
    );
    return;
  }

  try {
    await registerWithBackend({
      provider,
      providerAccountId,
      email,
      name,
    });
  } catch (err) {
    // Falla del adapter (upstream 5xx, red, BFF key inválida). No bloqueamos
    // el flujo de sign-in; el siguiente GET protegido reintentará vía PR2.
    const detail =
      err instanceof Error ? err.message : "unknown adapter failure";
    console.warn("[auth/events.signIn] registerWithBackend failed:", detail);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID ?? "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET ?? "",
  },
  callbacks: {
    async jwt({ token, user }) {
      const backendUserId = (user as UserWithBackendId | undefined)?.backendUserId;
      if (user && backendUserId) {
        token.sub = backendUserId;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  events: {
    signIn: handleSignInEvent,
  },
  pages: {
    signIn: "/auth/signin",
  },
};

export type AuthSession = SessionWithId;

// `BACKEND_URL` se mantiene exportado por compatibilidad histórica con
// consumidores que ya lo importaban desde este módulo. El adapter de auth
// usa su propio import interno desde `@/lib/api/backend`.
export { BACKEND_URL };