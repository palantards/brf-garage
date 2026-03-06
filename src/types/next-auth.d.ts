import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "resident";
      associationId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "resident";
    associationId: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: "admin" | "resident";
    associationId: string;
  }
}
