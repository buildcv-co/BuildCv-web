import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

export async function getJwtFromSession(): Promise<{ jwt: string; userId: string } | null> {
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
