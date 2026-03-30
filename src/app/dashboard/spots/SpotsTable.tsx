"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SpotRow, SpotStatus } from "./page";

const STATUS_LABEL: Record<SpotStatus, string> = {
  free:        "Ledig",
  occupied:    "Uthyrd",
  upcoming:    "Kommande",
  offered:     "Erbjuden",
  unavailable: "Ej tillgänglig",
};

const STATUS_STYLE: Record<SpotStatus, string> = {
  free:        "bg-[#dbe1ff] text-[#0048bf]",
  occupied:    "bg-green-100 text-green-700",
  upcoming:    "bg-amber-100 text-amber-700",
  offered:     "bg-yellow-100 text-yellow-700",
  unavailable: "bg-[var(--brf-surface-high)] text-[var(--brf-on-surface-muted)]",
};

function formatEndingAt(endingAt: string) {
  return new Date(endingAt).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateInputToIso(value: string): string {
  return new Date(value + "T00:00:00Z").toISOString();
}

function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

interface Props {
  initialSpots: SpotRow[];
  showAdd?: boolean;
  onCloseAdd?: () => void;
}

export default function SpotsTable({ initialSpots, showAdd = false, onCloseAdd }: Props) {
  const router = useRouter();
  const [spots, setSpots] = useState<SpotRow[]>(initialSpots);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingNotice, setEditingNotice] = useState<string | null>(null);
  const [noticeDate, setNoticeDate] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addIdentifier, setAddIdentifier] = useState("");
  const [addType, setAddType] = useState<"car" | "mc" | "electric">("car");
  const [offeringSent, setOfferingSent] = useState<string | null>(null);

  async function sendOffer(spotId: string) {
    setLoading(spotId);
    setError(null);
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Något gick fel");
      setOfferingSent(spotId);
      setTimeout(() => setOfferingSent(null), 3000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  async function patch(spotId: string, body: Record<string, unknown>) {
    setLoading(spotId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spots/${spotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Något gick fel");
      }
      router.refresh();
      setSpots(prev => prev.map(s => {
        if (s.id !== spotId) return s;
        if ("ending_at" in body) {
          const endingAt = (body.ending_at as string | null) ?? null;
          return { ...s, ending_at: endingAt, status: endingAt ? "upcoming" as const : "occupied" as const };
        }
        if ("available" in body) {
          return {
            ...s,
            available: body.available as boolean,
            status: (body.available as boolean) ? "free" as const : "unavailable" as const,
          };
        }
        return s;
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  async function deleteSpot(spotId: string) {
    setLoading(spotId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/spots/${spotId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Något gick fel");
      }
      setSpots(prev => prev.filter(s => s.id !== spotId));
      setConfirmDelete(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  async function addSpot(e: React.FormEvent) {
    e.preventDefault();
    const identifier = addIdentifier.trim();
    if (!identifier) return;

    setLoading("add");
    setError(null);
    try {
      const res = await fetch("/api/admin/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, type: addType }),
      });
      const data = await res.json() as { error?: string; id?: string };
      if (!res.ok) throw new Error(data.error ?? "Något gick fel");

      setSpots(prev => [
        ...prev,
        {
          id: data.id!,
          identifier,
          map_type: addType,
          available: true,
          status: "free" as const,
          resident_name: null,
          assignment_id: null,
          ending_at: null,
          map_x: null,
          preference_count: 0,
        },
      ].sort((a, b) => a.identifier.localeCompare(b.identifier, "sv")));

      setAddIdentifier("");
      setAddType("car");
      onCloseAdd?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  async function saveNotice(spotId: string) {
    if (!noticeDate) return;
    await patch(spotId, { ending_at: dateInputToIso(noticeDate) });
    setEditingNotice(null);
  }

  const isDeletable = (s: SpotRow) => s.status === "free" || s.status === "unavailable";
  const isAvailabilityToggleable = (s: SpotRow) => s.status === "free" || s.status === "unavailable";

  return (
    <div className="bg-[var(--brf-surface)] rounded-xl overflow-hidden" style={{ boxShadow: "0 12px 32px rgba(43,52,55,0.06)" }}>
      {error && (
        <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#9f403d]">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-[var(--brf-surface-low)] hover:bg-[var(--brf-surface-low)]">
            <TableHead className="px-4 sm:px-8 py-4 sm:py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Plats
            </TableHead>
            <TableHead className="hidden sm:table-cell px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Typ
            </TableHead>
            <TableHead className="px-4 sm:px-8 py-4 sm:py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Status
            </TableHead>
            <TableHead className="hidden md:table-cell px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Tilldelad till
            </TableHead>
            <TableHead className="px-4 sm:px-8 py-4 sm:py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] text-center">
              Tillgänglig
            </TableHead>
            <TableHead className="hidden md:table-cell px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Avtal upphör
            </TableHead>
            <TableHead className="px-4 sm:px-8 py-4 sm:py-5 text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] text-right">
              Åtgärder
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="divide-y divide-[var(--brf-surface-high)]">
          {spots.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[var(--brf-on-surface-muted)] py-16 text-sm">
                Inga platser ännu. Klicka &ldquo;Lägg till plats&rdquo; för att komma igång.
              </TableCell>
            </TableRow>
          )}

          {spots.map(spot => {
            const busy = loading === spot.id;
            const isEditing = editingNotice === spot.id;
            const isConfirmingDelete = confirmDelete === spot.id;
            const canToggle = isAvailabilityToggleable(spot);

            return (
              <TableRow
                key={spot.id}
                className="hover:bg-[var(--brf-surface-low)] transition-colors group"
              >
                {/* Identifier */}
                <TableCell className="px-4 sm:px-8 py-4 sm:py-6">
                  <span
                    className="text-base sm:text-lg font-bold text-[var(--brf-on-surface)]"
                    style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                  >
                    {spot.identifier}
                  </span>
                  {spot.map_x === null && (
                    <a
                      href="/dashboard/map/editor"
                      className="block text-[11px] text-[var(--brf-muted)] hover:text-[var(--brf-primary)] mt-0.5 transition-colors"
                    >
                      Ej på karta →
                    </a>
                  )}
                </TableCell>

                {/* Type — hidden on mobile */}
                <TableCell className="hidden sm:table-cell px-8 py-6">
                  <div className="flex items-center gap-2 text-[var(--brf-on-surface-muted)]">
                    <span className="material-symbols-outlined text-[var(--brf-muted)] text-[18px]">
                      {spot.map_type === "mc" ? "two_wheeler" : spot.map_type === "electric" ? "ev_station" : "directions_car"}
                    </span>
                    <span className="text-sm font-medium">
                      {spot.map_type === "mc" ? "MC" : spot.map_type === "electric" ? "Elbil" : "Bil"}
                    </span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="px-4 sm:px-8 py-4 sm:py-6">
                  <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[spot.status]}`}>
                    {STATUS_LABEL[spot.status]}
                  </span>
                </TableCell>

                {/* Resident — hidden on mobile */}
                <TableCell className="hidden md:table-cell px-8 py-6">
                  {spot.resident_name ? (
                    <span className="text-sm font-semibold text-[var(--brf-on-surface)]">
                      {spot.resident_name}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--brf-muted)]">—</span>
                  )}
                </TableCell>

                {/* Availability toggle */}
                <TableCell className="px-4 sm:px-8 py-4 sm:py-6 text-center">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={spot.available}
                    onClick={() => canToggle && !busy && patch(spot.id, { available: !spot.available })}
                    disabled={!canToggle || busy}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      spot.available ? "bg-[var(--brf-primary)]" : "bg-[var(--brf-muted)]"
                    } ${!canToggle ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--brf-surface)] shadow transition-transform ${
                        spot.available ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </button>
                </TableCell>

                {/* Ending at — hidden on mobile */}
                <TableCell className="hidden md:table-cell px-8 py-6">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        className="border border-[var(--brf-muted)] rounded-lg px-2 py-1 text-sm text-[var(--brf-on-surface)] bg-[var(--brf-surface)] focus:outline-none focus:border-[var(--brf-primary)]"
                        value={noticeDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={e => setNoticeDate(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={() => saveNotice(spot.id)} disabled={!noticeDate || busy}>
                        Spara
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingNotice(null)} disabled={busy}>
                        Avbryt
                      </Button>
                    </div>
                  ) : spot.ending_at ? (
                    <span className="text-sm font-semibold text-[#9f403d] bg-red-50 px-2 py-0.5 rounded">
                      {formatEndingAt(spot.ending_at)}
                    </span>
                  ) : (
                    <span className="text-sm text-[var(--brf-muted)]">—</span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="px-4 sm:px-8 py-4 sm:py-6 text-right">
                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-[#9f403d]">Ta bort?</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(null)} disabled={busy}>
                        Avbryt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#9f403d] hover:bg-[#8a3533] text-white text-xs"
                        onClick={() => deleteSpot(spot.id)}
                        disabled={busy}
                      >
                        {busy ? "Tar bort…" : "Bekräfta"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      {/* Send offer for free spots */}
                      {spot.status === "free" && (
                        offeringSent === spot.id ? (
                          <span className="text-xs font-semibold text-emerald-600 mr-1">Erbjudande skickat!</span>
                        ) : (
                          <button
                            type="button"
                            className="p-2 rounded-lg text-[var(--brf-primary)] hover:bg-[var(--brf-primary-tint)] transition-all"
                            onClick={() => sendOffer(spot.id)}
                            disabled={busy}
                            title="Skicka erbjudande till nästa i kön"
                          >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                          </button>
                        )
                      )}
                      {/* Set / clear notice for occupied/upcoming */}
                      {(spot.status === "occupied" || spot.status === "upcoming") && !isEditing && (
                        <button
                          type="button"
                          className="p-2 rounded-lg text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-primary)] hover:bg-[var(--brf-surface-high)] transition-all"
                          onClick={() => {
                            setEditingNotice(spot.id);
                            setNoticeDate(spot.ending_at ? isoToDateInput(spot.ending_at) : "");
                          }}
                          disabled={busy}
                          title={spot.ending_at ? "Ändra datum" : "Ange uppsägningstid"}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {/* Clear notice */}
                      {spot.ending_at && !isEditing && (
                        <button
                          type="button"
                          className="p-2 rounded-lg text-[var(--brf-muted)] hover:text-[var(--brf-on-surface-muted)] hover:bg-[var(--brf-surface-high)] transition-all"
                          onClick={() => patch(spot.id, { ending_at: null })}
                          disabled={busy}
                          title="Rensa datum"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                      {/* Delete for free/unavailable */}
                      {isDeletable(spot) && (
                        <button
                          type="button"
                          className="p-2 rounded-lg text-[var(--brf-muted)] hover:text-[#9f403d] hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => setConfirmDelete(spot.id)}
                          disabled={busy}
                          title="Ta bort plats"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Add spot form (shown when sub-header button is clicked) */}
      {showAdd && (
        <div className="border-t border-[var(--brf-surface-high)] bg-[var(--brf-surface-hover)] px-8 py-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] mb-4">
            Ny plats
          </p>
          <form onSubmit={addSpot} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-identifier" className="text-[10px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
                Identifierare
              </Label>
              <Input
                id="add-identifier"
                placeholder="t.ex. A12"
                value={addIdentifier}
                onChange={e => setAddIdentifier(e.target.value)}
                className="w-36 border-2 border-[var(--brf-muted)]/30 focus-visible:border-[#0053db] focus-visible:ring-0 rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-type" className="text-[10px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
                Typ
              </Label>
              <Select value={addType} onValueChange={v => setAddType(v as "car" | "mc" | "electric")}>
                <SelectTrigger id="add-type" className="w-28 border-2 border-[var(--brf-muted)]/30 focus:ring-0 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Bil</SelectItem>
                  <SelectItem value="mc">MC</SelectItem>
                  <SelectItem value="electric">Elbil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="submit"
              disabled={!addIdentifier.trim() || loading === "add"}
              className="px-6 py-2.5 rounded-full font-bold text-sm text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, var(--brf-primary) 0%, var(--brf-primary-dim) 100%)" }}
            >
              {loading === "add" ? "Sparar…" : "Lägg till"}
            </button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setAddIdentifier(""); setAddType("car"); onCloseAdd?.(); }}
              disabled={loading === "add"}
              className="text-[var(--brf-on-surface-muted)]"
            >
              Avbryt
            </Button>
          </form>
        </div>
      )}

      {/* Footer: count */}
      {!showAdd && spots.length > 0 && (
        <div className="px-8 py-4 bg-[var(--brf-surface-low)] border-t border-[var(--brf-surface-high)]">
          <p className="text-xs text-[var(--brf-on-surface-muted)] font-medium">
            Visar <span className="font-bold text-[var(--brf-on-surface)]">{spots.length}</span>{" "}
            {spots.length === 1 ? "plats" : "platser"}
          </p>
        </div>
      )}
    </div>
  );
}
