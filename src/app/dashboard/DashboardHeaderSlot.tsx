"use client";

import { useHeaderPageConfig } from "./DashboardHeaderContext";

export default function DashboardHeaderSlot() {
  const config = useHeaderPageConfig();

  if (!config) return <div className="flex-1" />;

  return (
    <div className="flex-1 flex items-center justify-between px-8">
      <div className="relative max-w-xs w-full">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#586064] text-[20px]">
          search
        </span>
        <input
          type="text"
          placeholder={config.searchPlaceholder}
          className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-full text-sm text-[#2b3437] placeholder:text-[#586064]/50 focus:outline-none focus:ring-2 focus:ring-[#0053db]/30"
        />
      </div>

      {config.actionLabel && (
        <button
          onClick={config.onAction}
          className="flex items-center gap-2 rounded-full px-5 py-2 font-bold text-sm text-white ml-4 hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)",
            boxShadow: "0 4px 12px rgba(0,83,219,0.25)",
          }}
        >
          <span className="material-symbols-outlined text-[18px]">{config.actionIcon}</span>
          {config.actionLabel}
        </button>
      )}
    </div>
  );
}
