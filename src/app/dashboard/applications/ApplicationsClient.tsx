"use client";

import { useState } from "react";
import { useRegisterHeaderConfig } from "../DashboardHeaderContext";
import CreateApplicationSheet from "./CreateApplicationSheet";

export default function ApplicationsClient({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useRegisterHeaderConfig({
    searchPlaceholder: "Sök ansökan...",
    actionLabel: "Skapa ansökan",
    actionIcon: "add",
    onAction: () => setSheetOpen(true),
  });

  return (
    <>
      {children}
      <CreateApplicationSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
