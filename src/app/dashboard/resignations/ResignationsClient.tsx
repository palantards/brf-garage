"use client";

import { useState } from "react";
import { useRegisterHeaderConfig } from "../DashboardHeaderContext";
import CreateResignationSheet from "./CreateResignationSheet";

interface Assignment {
  id: string;
  spot_identifier: string;
  user_name: string | null;
  user_email: string;
  agreement_type: string;
}

export default function ResignationsClient({
  children,
  assignments,
}: {
  children: React.ReactNode;
  assignments: Assignment[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  useRegisterHeaderConfig({
    searchPlaceholder: "Sök uppsägning...",
    actionLabel: "Skapa uppsägning",
    actionIcon: "add",
    onAction: () => setSheetOpen(true),
  });

  return (
    <>
      {children}
      <CreateResignationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        assignments={assignments}
      />
    </>
  );
}
