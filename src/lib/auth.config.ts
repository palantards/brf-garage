import type { NextAuthConfig } from "next-auth";

// Edge-compatible config (no Node.js-only dependencies like bcryptjs)
// Used by middleware.ts for route protection
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/invite");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isAuthRoute || isApiAuth) return true;
      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.associationId = user.associationId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role as "admin" | "resident";
      session.user.associationId = token.associationId as string;
      return session;
    },
  },
  providers: [], // providers added in auth.ts (Node.js runtime only)
};
