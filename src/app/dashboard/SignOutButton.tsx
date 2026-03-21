"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => signOut({ redirectTo: "/login" })}
      className="text-[#0053db] hover:text-[#0048c1] hover:bg-transparent font-medium px-0"
    >
      Logga ut
    </Button>
  );
}
