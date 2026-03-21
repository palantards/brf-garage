"use client";

import { useRegisterHeaderConfig } from "../DashboardHeaderContext";

export default function QueueClient({ children }: { children: React.ReactNode }) {
  useRegisterHeaderConfig({
    searchPlaceholder: "Sök kömedlem…",
  });

  return <>{children}</>;
}
