"use client";

import { useState } from "react";
import { useRegisterHeaderConfig } from "../DashboardHeaderContext";
import SpotsTable from "./SpotsTable";
import type { SpotRow } from "./page";

interface Props {
  initialSpots: SpotRow[];
  total: number;
  free: number;
  upcoming: number;
}

export default function SpotsClient({ initialSpots, total, free, upcoming }: Props) {
  const [showAdd, setShowAdd] = useState(false);

  useRegisterHeaderConfig({
    searchPlaceholder: "Sök plats eller namn…",
    actionLabel: "Lägg till plats",
    actionIcon: "add",
    onAction: () => setShowAdd(true),
  });

  return (
    <div className="p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10">

      {/* Page heading + bento stats */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-8">
        <div className="space-y-2">
          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2b3437] leading-none"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Platser
          </h2>
          <p className="text-sm text-[#586064] font-medium">
            Hantering av parkeringsplatser och avtal
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-2">Totalt</p>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#2b3437]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
              {total}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-2">Lediga</p>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#0053db]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
              {free}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-2">Kommande</p>
            <p className="text-2xl sm:text-4xl font-extrabold text-[#2b3437]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
              {upcoming}
            </p>
          </div>
        </div>
      </div>

      {/* Spots table */}
      <SpotsTable
        initialSpots={initialSpots}
        showAdd={showAdd}
        onCloseAdd={() => setShowAdd(false)}
      />
    </div>
  );
}
