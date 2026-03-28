import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/db/client";
import { authConfig } from "./auth.config";

// Simple per-email rate limiter.
// Module-level Map persists across requests on the same Node.js instance.
// NOTE: In a multi-instance/serverless environment this is per-warm-instance only.
// For stricter enforcement at production scale, replace with Upstash Redis.
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= LOGIN_MAX_ATTEMPTS;
}

function recordLoginSuccess(email: string) {
  loginAttempts.delete(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (!checkLoginRateLimit(credentials.email as string)) return null;

        const [user] = await sql<
          {
            id: string;
            email: string;
            name: string | null;
            role: "admin" | "resident";
            association_id: string;
            password_hash: string | null;
          }[]
        >`
          SELECT id, email, name, role, association_id, password_hash
          FROM users
          WHERE email = ${credentials.email as string}
            AND joined_at IS NOT NULL
        `;

        if (!user || !user.password_hash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        recordLoginSuccess(credentials.email as string);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          associationId: user.association_id,
        };
      },
    }),
  ],
});
