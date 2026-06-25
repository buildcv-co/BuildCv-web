import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";

export const IS_LOCAL = process.env.NEXT_PUBLIC_LOCAL_MODE === "true";

export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
export const LOCAL_USER_EMAIL = "local@buildcv.dev";
export const LOCAL_USER_NAME = "Local User";

export const NEXT_AUTH_ISSUER = process.env.NEXTAUTH_ISSUER ?? "buildcv-web";
export const NEXT_AUTH_AUDIENCE = process.env.NEXTAUTH_AUDIENCE ?? "buildcv-api";

type UserWithBackendId = { backendUserId?: string };
type SessionWithId = { user: { id?: string } };

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
    async signIn({ user, account }) {
      const provider = account?.provider;
      const providerId = account?.providerAccountId;
      const email = user.email;
      const name = user.name;

      if (!provider || !providerId || !email) return false;

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/${provider}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, email, name }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as { userId?: string };
      if (!data.userId) return false;

      (user as UserWithBackendId).backendUserId = data.userId;
      return true;
    },
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
  pages: {
    signIn: "/auth/signin",
  },
};

export type AuthSession = SessionWithId;
