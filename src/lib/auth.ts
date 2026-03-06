import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import sql from "@/db/client";
import { authConfig } from "./auth.config";

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
