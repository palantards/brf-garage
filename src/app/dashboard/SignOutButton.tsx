"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="text-gray-500 hover:text-gray-900"
    >
      Logga ut
    </Button>
  );
}
