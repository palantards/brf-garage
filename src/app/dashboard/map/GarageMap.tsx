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
  mode?: "view" | "picker";
  onSpotPick?: (spot: Spot) => void;
}

export default function GarageMap({
  spots,
  isAdmin = false,
  imageUrl,
  aspectRatio = 52.69,
  mode = "view",
  onSpotPick,
}: Props) {
  const [selected, setSelected] = useState<Spot | null>(null);
  const isPicker = mode === "picker";

  return (
    <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
      {/* Map canvas */}
      <div className="flex-1 min-w-0">
      <div
        className="relative w-full select-none overflow-hidden rounded-xl shadow-inner border border-[var(--brf-border)]"
        style={{
          paddingBottom: `${aspectRatio}%`,
          backgroundColor: "var(--brf-surface)",
        }}
      >
        <div
          className="absolute inset-0"
          style={
            imageUrl
              ? {
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: "100% 100%",
                }
              : undefined
          }
        >
          {spots.map((spot) => {
            const isSelected = selected?.id === spot.id;
            const disabled = isPicker && spot.status !== "free";
            return (
              <div
                key={spot.id}
                onClick={() => {
                  if (disabled) return;
                  setSelected(isSelected ? null : spot);
                }}
                style={{
                  position: "absolute",
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                  transform: `rotate(${spot.rotation ?? 0}deg)`,
                  transformOrigin: "center center",
                  backgroundColor: STATUS_COLOR[spot.status],
                  opacity: disabled ? 0.35 : isSelected ? 0.95 : 0.8,
                  border: isSelected
                    ? "2px solid #fff"
                    : "1px solid rgba(255,255,255,0.5)",
                  boxShadow: isSelected ? "0 0 0 2px var(--brf-primary)" : undefined,
                  borderRadius: "2px",
                  cursor: disabled ? "not-allowed" : "pointer",
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
      <div className="w-full sm:w-64 shrink-0 bg-[var(--brf-surface)] rounded-xl shadow-sm border border-[var(--brf-border)] p-5 flex flex-col">
        {selected ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-[var(--brf-primary-tint)] text-[var(--brf-primary)] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  {selected.type === "mc" ? "two_wheeler" : "directions_car"}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-full hover:bg-[var(--brf-surface-low)] text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-on-surface)] transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>

            <h3
              className="font-extrabold text-lg text-[var(--brf-on-surface)] leading-tight"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {selected.type === "mc" ? "MC-plats" : "Plats"} {selected.label}
            </h3>

            {selected.residentName && (
              <p className="text-sm text-[var(--brf-on-surface-muted)] mt-1">Boende: {selected.residentName}</p>
            )}

            <span
              className={`mt-3 self-start px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_BADGE[selected.status]}`}
            >
              {STATUS_LABEL[selected.status]}
            </span>

            {selected.endingAt && (
              <div className="mt-5 pt-4 border-t border-[var(--brf-divider)]">
                <p className="text-[10px] text-[var(--brf-on-surface-muted)] uppercase font-bold tracking-widest">
                  Beräknat ledigt
                </p>
                <p className="font-medium text-sm mt-1 text-[var(--brf-on-surface)]">
                  {new Date(selected.endingAt).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </p>
              </div>
            )}

            {isPicker && selected.status === "free" && (
              <button
                onClick={() => onSpotPick?.(selected)}
                className="mt-5 w-full text-white font-semibold py-3 rounded-full text-sm transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                }}
              >
                Välj denna plats
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center gap-3">
            <div className="w-12 h-12 bg-[var(--brf-surface-low)] rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--brf-muted)]" style={{ fontSize: 24 }}>
                directions_car
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--brf-on-surface-muted)]">Välj en plats</p>
              <p className="text-xs text-[var(--brf-muted)] mt-0.5">Klicka på kartan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
