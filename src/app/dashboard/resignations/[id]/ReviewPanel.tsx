"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewResignationAction, updateResignationNotesAction } from "../actions";

interface Props {
  resignationId: string;
  status: string;
  adminNotes: string | null;
  agreementType: string;
}

export default function ReviewPanel({ resignationId, status, adminNotes, agreementType }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notes, setNotes] = useState(adminNotes || "");
  const [notesSaved, setNotesSaved] = useState(false);

  const canReview = status === "confirmed";
  const noticePeriod = agreementType === "temporary" ? "1 månad" : "3 månader";

  const endDate = new Date();
  if (agreementType === "temporary") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 3);
  }
  const endDateStr = endDate.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleReject() {
    if (!confirm("Är du säker på att du vill avslå denna uppsägning?")) return;
    startTransition(async () => {
      const result = await reviewResignationAction(resignationId, "reject");
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleApprove() {
    startTransition(async () => {
      const result = await reviewResignationAction(resignationId, "approve");
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateResignationNotesAction(resignationId, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    });
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
            Granska uppsägning
          </h3>

          {error && (
            <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2 mb-4">
              {error}
            </p>
          )}

          {!showConfirm ? (
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowConfirm(true)}
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
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">
                  Uppsägningstiden är {noticePeriod}.
                </p>
                <p className="text-sm text-amber-700">
                  Platsen blir ledig <strong>{endDateStr}</strong>. Ett erbjudande
                  skickas automatiskt till nästa person i kön.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleApprove}
                  disabled={pending}
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
                  onClick={() => setShowConfirm(false)}
                  className="text-sm text-[#586064] hover:text-[#2b3437] transition-colors px-4"
                >
                  Tillbaka
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
