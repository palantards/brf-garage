"use client";

import { useState } from "react";
import { useRegisterHeaderConfig } from "../DashboardHeaderContext";
import InviteSheet from "./InviteSheet";

export default function ResidentsClient({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useRegisterHeaderConfig({
    searchPlaceholder: "Sök boende eller e-post…",
    actionLabel: "Bjud in admin",
    actionIcon: "person_add",
    onAction: () => setSheetOpen(true),
  });

  return (
    <>
      {children}
      <InviteSheet open={sheetOpen} onClose={() => setSheetOpen(false)} adminOnly />
    </>
  );
}
