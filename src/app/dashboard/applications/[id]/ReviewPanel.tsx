"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewApplicationAction, updateNotesAction } from "../actions";
import GarageMap, { type Spot as MapSpot } from "../../map/GarageMap";

interface Spot {
  id: string;
  identifier: string;
  map_type: string;
}

interface Props {
  applicationId: string;
  status: string;
  adminNotes: string | null;
  freeSpots: Spot[];
  mapSpots: MapSpot[];
  mapPublished: boolean;
}

const SPOT_TYPE_LABELS: Record<string, string> = {
  car: "Bil",
  mc: "MC",
  electric: "Elbil",
};

export default function ReviewPanel({ applicationId, status, adminNotes, freeSpots, mapSpots, mapPublished }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showApproveOptions, setShowApproveOptions] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"queue" | "assign">("queue");
  const [selectedSpot, setSelectedSpot] = useState<string>("");
  const [selectedSpotLabel, setSelectedSpotLabel] = useState<string>("");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [notes, setNotes] = useState(adminNotes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const canReview = status === "submitted" || status === "in_review";
  const hasMap = mapPublished && mapSpots.length > 0;

  function handleReject() {
    if (!confirm("Är du säker på att du vill avslå denna ansökan?")) return;
    startTransition(async () => {
      const result = await reviewApplicationAction(applicationId, "reject");
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleApprove() {
    if (approvalAction === "assign" && !selectedSpot) {
      setError("Välj en plats att tilldela.");
      return;
    }
    startTransition(async () => {
      const result = await reviewApplicationAction(
        applicationId,
        "approve",
        approvalAction,
        approvalAction === "assign" ? selectedSpot : undefined
      );
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateNotesAction(applicationId, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    });
  }

  function handleMapPick(spot: MapSpot) {
    setSelectedSpot(spot.id);
    setSelectedSpotLabel(spot.label);
    setShowMapPicker(false);
  }

  return (
    <div className="space-y-6">
      {/* Admin notes */}
      <div className="bg-[var(--brf-surface)] rounded-xl p-6 border border-[var(--brf-muted)]/10">
        <h3
          className="text-lg font-bold text-[var(--brf-on-surface)] mb-4"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          Anteckningar
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Lägg till interna anteckningar..."
          className="w-full bg-[var(--brf-surface-low)] border-2 border-[var(--brf-muted)]/20 rounded-lg px-4 py-3 text-sm text-[var(--brf-on-surface)] placeholder:text-[var(--brf-on-surface-muted)] outline-none focus:border-[var(--brf-primary)] transition-colors resize-none"
        />
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={handleSaveNotes}
            disabled={pending}
            className="text-xs font-semibold text-[var(--brf-primary)] hover:underline disabled:opacity-50"
          >
            Spara anteckningar
          </button>
          {notesSaved && (
            <span className="text-xs text-green-600">Sparat!</span>
          )}
        </div>
      </div>

      {/* Review actions */}
      {canReview && (
        <div className="bg-[var(--brf-surface)] rounded-xl p-6 border border-[var(--brf-muted)]/10">
          <h3
            className="text-lg font-bold text-[var(--brf-on-surface)] mb-4"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Granska ansökan
          </h3>

          {error && (
            <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {!showApproveOptions ? (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowApproveOptions(true)}
                disabled={pending}
                className="flex-1 rounded-full py-5 font-bold text-sm gap-2"
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "white",
                  border: "none",
                }}
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Godkänn
              </Button>
              <Button
                type="button"
                onClick={handleReject}
                disabled={pending}
                className="flex-1 rounded-full py-5 font-bold text-sm gap-2"
                style={{
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  color: "white",
                  border: "none",
                }}
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                Avslå
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalAction("queue")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: approvalAction === "queue" ? "#0053db" : "rgba(171,179,183,0.3)",
                    backgroundColor: approvalAction === "queue" ? "#f0f4ff" : "transparent",
                    color: approvalAction === "queue" ? "#0053db" : "#586064",
                  }}
                >
                  Lägg till i kö
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalAction("assign")}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{
                    borderColor: approvalAction === "assign" ? "#0053db" : "rgba(171,179,183,0.3)",
                    backgroundColor: approvalAction === "assign" ? "#f0f4ff" : "transparent",
                    color: approvalAction === "assign" ? "#0053db" : "#586064",
                  }}
                >
                  Tilldela plats direkt
                </button>
              </div>

              {approvalAction === "assign" && (
                <div className="space-y-3">
                  {freeSpots.length === 0 ? (
                    <p className="text-sm text-[var(--brf-on-surface-muted)] italic">
                      Det finns inga lediga platser just nu.
                    </p>
                  ) : (
                    <>
                      {/* Selected spot display */}
                      {selectedSpot ? (
                        <div className="flex items-center justify-between bg-[var(--brf-surface-low)] rounded-lg px-4 py-3 border-2 border-[#16a34a]/30">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#16a34a] text-[18px]">check_circle</span>
                            <span className="text-sm font-semibold text-[var(--brf-on-surface)]">
                              Plats {selectedSpotLabel}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelectedSpot(""); setSelectedSpotLabel(""); }}
                            className="text-xs text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-on-surface)] transition-colors"
                          >
                            Ändra
                          </button>
                        </div>
                      ) : hasMap ? (
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--brf-muted)]/40 text-sm font-semibold text-[var(--brf-primary)] hover:border-[var(--brf-primary)]/40 hover:bg-[var(--brf-surface-low)] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">map</span>
                          Välj plats på kartan
                        </button>
                      ) : (
                        <select
                          value={selectedSpot}
                          onChange={(e) => {
                            setSelectedSpot(e.target.value);
                            const s = freeSpots.find((s) => s.id === e.target.value);
                            setSelectedSpotLabel(s?.identifier || "");
                          }}
                          className="w-full bg-[var(--brf-surface-low)] border-2 border-[var(--brf-muted)]/20 rounded-lg px-4 py-3 text-sm text-[var(--brf-on-surface)] outline-none focus:border-[var(--brf-primary)] transition-colors"
                        >
                          <option value="">Välj plats...</option>
                          {freeSpots.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.identifier} ({SPOT_TYPE_LABELS[s.map_type] || s.map_type})
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={pending || (approvalAction === "assign" && !selectedSpot)}
                  className="flex-1 rounded-full py-5 font-bold text-sm gap-2"
                  style={{
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    color: "white",
                    border: "none",
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {pending ? "Godkänner..." : "Bekräfta godkännande"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowApproveOptions(false)}
                  className="text-sm text-[#586064] hover:text-[#2b3437] transition-colors px-4"
                >
                  Tillbaka
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map picker modal */}
      {showMapPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMapPicker(false); }}
        >
          <div
            className="bg-[var(--brf-bg)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ fontFamily: "var(--font-inter), sans-serif" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--brf-border)]">
              <div>
                <h3
                  className="text-lg font-bold text-[var(--brf-on-surface)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Välj plats på kartan
                </h3>
                <p className="text-sm text-[var(--brf-on-surface-muted)] mt-0.5">
                  Klicka på en ledig plats (grön) och tryck &quot;Välj denna plats&quot;
                </p>
              </div>
              <button
                onClick={() => setShowMapPicker(false)}
                className="p-2 rounded-full hover:bg-[var(--brf-surface-low)] text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-on-surface)] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-6 py-3 bg-[var(--brf-surface-low)] border-b border-[var(--brf-border)]">
              {[
                { color: "#22c55e", label: "Ledig" },
                { color: "#ef4444", label: "Uthyrd" },
                { color: "#f97316", label: "Kommande" },
                { color: "#f59e0b", label: "Erbjuden" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-medium text-[var(--brf-on-surface-muted)]">{label}</span>
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="flex-1 overflow-auto p-6">
              <GarageMap
                spots={mapSpots}
                isAdmin
                imageUrl="/api/map/image"
                mode="picker"
                onSpotPick={handleMapPick}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
