"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

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
  /** Clockwise rotation in degrees (default 0) */
  rotation?: number;
  type?: SpotType;
  residentName?: string;
  /** ISO timestamp — set when a resident has given notice; status will be "upcoming" */
  endingAt?: string;
}

const STATUS_COLOR: Record<SpotStatus, string> = {
  free:     "#22c55e",
  occupied: "#ef4444",
  offered:  "#eab308",
  upcoming: "#f97316",
};

const STATUS_LABEL: Record<SpotStatus, string> = {
  free:     "Ledig",
  occupied: "Upptagen",
  offered:  "Erbjuden",
  upcoming: "Kommande",
};

interface Props {
  spots: Spot[];
  isAdmin?: boolean;
  /** URL of the garage floor plan image. If omitted, a neutral gray bg is used. */
  imageUrl?: string;
  /** padding-bottom % to maintain aspect ratio (height/width × 100). Default 52.69 (1338×705). */
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
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        {(["free", "occupied", "upcoming", "offered"] as SpotStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-white/40 shadow-sm"
              style={{ backgroundColor: STATUS_COLOR[s] }}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {/* Map */}
      <div
        className="relative w-full select-none overflow-hidden rounded-lg border border-gray-200"
        style={{ paddingBottom: `${aspectRatio}%` }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={
            imageUrl
              ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "100% 100%" }
              : { backgroundColor: "#f9fafb" }
          }
        >
          {/* Spots */}
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
                  opacity: isSelected ? 0.92 : 0.72,
                  border: isSelected
                    ? "2px solid #1e293b"
                    : "1px solid rgba(255,255,255,0.55)",
                  borderRadius: "2px",
                  cursor: isAdmin ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  transition: "opacity 0.1s, border 0.1s",
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

      {/* Selected spot detail */}
      {selected && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-start justify-between gap-4 shadow-sm">
          <div>
            <p className="font-semibold text-gray-900">
              {selected.type === "mc" ? "MC-plats" : "Plats"} {selected.label}
            </p>
            {selected.residentName && (
              <p className="text-sm text-gray-500 mt-0.5">{selected.residentName}</p>
            )}
            {selected.endingAt && (
              <p className="text-sm text-orange-600 mt-0.5">
                Beräknat ledigt:{" "}
                {new Date(selected.endingAt).toLocaleDateString("sv-SE", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            <Badge
              variant="outline"
              className="mt-2"
              style={{
                color: STATUS_COLOR[selected.status],
                borderColor: STATUS_COLOR[selected.status] + "66",
              }}
            >
              {STATUS_LABEL[selected.status]}
            </Badge>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-2 shrink-0 text-right">
              {selected.status !== "free" && (
                <button className="text-sm font-medium text-green-600 hover:underline">
                  Markera som ledig
                </button>
              )}
              {selected.status === "free" && (
                <button className="text-sm font-medium text-blue-600 hover:underline">
                  Tilldela boende
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        {(["free", "occupied", "upcoming", "offered"] as SpotStatus[]).map((s) => {
          const count = spots.filter((sp) => sp.status === s).length;
          return (
            <div key={s} className="rounded-lg border border-gray-200 bg-white py-3 px-2">
              <p className="text-2xl font-bold" style={{ color: STATUS_COLOR[s] }}>
                {count}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{STATUS_LABEL[s]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
