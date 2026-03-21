"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface HeaderPageConfig {
  searchPlaceholder: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
}

const SetCtx = createContext<(c: HeaderPageConfig | null) => void>(() => {});
const ConfigCtx = createContext<HeaderPageConfig | null>(null);

export function DashboardHeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<HeaderPageConfig | null>(null);
  return (
    <SetCtx.Provider value={setConfig}>
      <ConfigCtx.Provider value={config}>
        {children}
      </ConfigCtx.Provider>
    </SetCtx.Provider>
  );
}

export function useHeaderPageConfig() {
  return useContext(ConfigCtx);
}

/** Call this inside a page's client wrapper to populate the top nav. */
export function useRegisterHeaderConfig(config: HeaderPageConfig) {
  const set = useContext(SetCtx);
  useEffect(() => {
    set(config);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
