import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import {
  authOptions,
  IS_LOCAL,
  LOCAL_USER_EMAIL,
  LOCAL_USER_ID,
  LOCAL_USER_NAME,
  NEXT_AUTH_AUDIENCE,
  NEXT_AUTH_ISSUER,
} from "@/lib/auth";

type CachedJwt = { jwt: string; expiresAt: number };
type SessionPayload = {
  jwt: string;
  expiresAt: string;
  user: { id: string; email: string; name: string };
};
type AuthedSession = {
  user: { id?: string; email?: string | null; name?: string | null };
};

const cache = new Map<string, CachedJwt>();
const DEFAULT_TTL_SECONDS = 300;
const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

function getCacheTtlMs(): number {
  const raw = process.env.JWT_CACHE_TTL_SECONDS;
  const seconds = raw ? Number(raw) : DEFAULT_TTL_SECONDS;
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_TTL_SECONDS * 1000;
}

async function getNextAuthSessionToken(): Promise<string> {
  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const entry = cookieStore.get(name);
    if (entry?.value) return entry.value;
  }
  throw new Error("NextAuth session cookie missing.");
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signLocalHs256Jwt(payload: Record<string, unknown>): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("NEXTAUTH_SECRET is required and must be at least 32 characters for local mode.");
  }
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.${signature}`;
}

function buildLocalNextAuthJwt(): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signLocalHs256Jwt({
    sub: LOCAL_USER_ID,
    email: LOCAL_USER_EMAIL,
    name: LOCAL_USER_NAME,
    iss: NEXT_AUTH_ISSUER,
    aud: NEXT_AUTH_AUDIENCE,
    iat: nowSeconds,
    exp: nowSeconds + 7 * 24 * 60 * 60,
  });
}

export async function getJwtFromSession(): Promise<{ jwt: string; userId: string } | null> {
  if (IS_LOCAL) {
    return getLocalSessionJwt();
  }

  const session = (await getServerSession(authOptions)) as AuthedSession | null;
  if (!session?.user) return null;

  const userId = session.user.id;
  if (!userId) return null;

  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { jwt: cached.jwt, userId };
  }

  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:5080";
  const nextAuthToken = await getNextAuthSessionToken();

  const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
    method: "GET",
    headers: { Authorization: `Bearer ${nextAuthToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as SessionPayload;
  if (!data.jwt || !data.expiresAt) return null;

  const expiresAt = new Date(data.expiresAt).getTime();
  const ttlMs = getCacheTtlMs();
  const effectiveExpiresAt = Math.min(expiresAt, now + ttlMs);
  cache.set(userId, { jwt: data.jwt, expiresAt: effectiveExpiresAt });

  return { jwt: data.jwt, userId };
}

async function getLocalSessionJwt(): Promise<{ jwt: string; userId: string } | null> {
  const userId = LOCAL_USER_ID;
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return { jwt: cached.jwt, userId };
  }

  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:5080";
  const nextAuthToken = buildLocalNextAuthJwt();

  const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
    method: "GET",
    headers: { Authorization: `Bearer ${nextAuthToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as SessionPayload;
  if (!data.jwt || !data.expiresAt) return null;

  const expiresAt = new Date(data.expiresAt).getTime();
  const ttlMs = getCacheTtlMs();
  const effectiveExpiresAt = Math.min(expiresAt, now + ttlMs);
  cache.set(userId, { jwt: data.jwt, expiresAt: effectiveExpiresAt });

  return { jwt: data.jwt, userId };
}

export function clearJwtCache(): void {
  cache.clear();
}

const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt <= now) cache.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweepTimer.unref?.();
