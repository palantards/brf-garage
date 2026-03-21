"use client";

import { useState } from "react";

export type SpotStatus = "free" | "occupied" | "offered" | "upcoming";
export type SpotType = "car" | "mc";

export interface Spot {
  id: string;
  label: string;
  status: SpotStatus;
  /** Position as % of container (0–100) */
  x: number;
  y: number;
  /** Size as % of container (0–100) */
  width: number;
  height: number;
  rotation?: number;
  type?: SpotType;
  residentName?: string;
  endingAt?: string;
}

export const STATUS_COLOR: Record<SpotStatus, string> = {
  free:     "#22c55e",
  occupied: "#ef4444",
  offered:  "#f59e0b",
  upcoming: "#f97316",
};

export const STATUS_LABEL: Record<SpotStatus, string> = {
  free:     "Ledig",
  occupied: "Uthyrd",
  offered:  "Erbjuden",
  upcoming: "Kommande",
};

const STATUS_BADGE: Record<SpotStatus, string> = {
  free:     "bg-emerald-100 text-emerald-700",
  occupied: "bg-rose-100 text-rose-700",
  offered:  "bg-amber-100 text-amber-700",
  upcoming: "bg-orange-100 text-orange-700",
};

interface Props {
  spots: Spot[];
  isAdmin?: boolean;
  imageUrl?: string;
  aspectRatio?: number;
}

export default function GarageMap({
  spots,
  isAdmin = false,
  imageUrl,
  aspectRatio = 52.69,
}: Props) {
  const [selected, setSelected] = useState<Spot | null>(null);

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
      {/* Map canvas */}
      <div className="flex-1 min-w-0">
      <div
        className="relative w-full select-none overflow-hidden rounded-xl shadow-inner border border-[#c3c6d7]/10"
        style={{
          paddingBottom: `${aspectRatio}%`,
          backgroundColor: "#e6e8ea",
        }}
      >
        <div
          className="absolute inset-0"
          style={
            imageUrl
              ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "100% 100%" }
              : undefined
          }
        >
          {spots.map((spot) => {
            const isSelected = selected?.id === spot.id;
            return (
              <div
                key={spot.id}
                onClick={() => setSelected(isSelected ? null : spot)}
                style={{
                  position: "absolute",
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  transform: `rotate(${spot.rotation ?? 0}deg)`,
                  transformOrigin: "center center",
                  backgroundColor: STATUS_COLOR[spot.status],
                  opacity: isSelected ? 0.95 : 0.8,
                  border: isSelected
                    ? "2px solid #fff"
                    : "1px solid rgba(255,255,255,0.5)",
                  boxShadow: isSelected ? "0 0 0 2px #004ac6" : undefined,
                  borderRadius: "2px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  transition: "opacity 0.1s, box-shadow 0.1s",
                }}
                title={`${spot.label}${spot.residentName ? ` – ${spot.residentName}` : ""} (${STATUS_LABEL[spot.status]})`}
              >
                <span
                  style={{
                    fontSize: "clamp(6px, 0.9vw, 11px)",
                    fontWeight: 700,
                    color: "#fff",
                    textShadow: "0 0 4px rgba(0,0,0,0.6)",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {spot.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* Detail panel — always visible */}
      <div className="w-full sm:w-64 shrink-0 bg-white rounded-xl shadow-sm border border-[#c3c6d7]/10 p-5 flex flex-col">
        {selected ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[#004ac6]/10 text-[#004ac6] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {selected.type === "mc" ? "two_wheeler" : "directions_car"}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-full hover:bg-[#f2f4f6] text-[#737686] hover:text-[#191c1e] transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>

            <h3
              className="font-extrabold text-lg text-[#191c1e] leading-tight"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {selected.type === "mc" ? "MC-plats" : "Plats"} {selected.label}
            </h3>

            {selected.residentName && (
              <p className="text-sm text-[#434655] mt-1">Boende: {selected.residentName}</p>
            )}

            <span
              className={`mt-3 self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[selected.status]}`}
            >
              {STATUS_LABEL[selected.status]}
            </span>

            {selected.endingAt && (
              <div className="mt-5 pt-4 border-t border-[#f2f4f6]">
                <p className="text-[10px] text-[#434655] uppercase font-bold tracking-widest">
                  Beräknat ledigt
                </p>
                <p className="font-medium text-sm mt-1 text-[#191c1e]">
                  {new Date(selected.endingAt).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-3">
            <div className="w-12 h-12 bg-[#f2f4f6] rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#c3c6d7]" style={{ fontSize: 24 }}>
                directions_car
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#434655]">Välj en plats</p>
              <p className="text-xs text-[#c3c6d7] mt-0.5">Klicka på kartan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
