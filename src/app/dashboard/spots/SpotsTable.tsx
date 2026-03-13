"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
  occupied:    "Upptagen",
  upcoming:    "Kommande",
  offered:     "Erbjuden",
  unavailable: "Ej tillgänglig",
};

const STATUS_CLASS: Record<SpotStatus, string> = {
  free:        "text-green-600 border-green-200",
  occupied:    "text-red-600 border-red-200",
  upcoming:    "text-orange-600 border-orange-200",
  offered:     "text-yellow-600 border-yellow-200",
  unavailable: "text-gray-500 border-gray-200",
};

function formatEndingAt(endingAt: string) {
  return new Date(endingAt).toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });
}

// Converts a date input value (YYYY-MM-DD) to a midnight UTC ISO string
function dateInputToIso(value: string): string {
  return new Date(value + "T00:00:00Z").toISOString();
}

// Converts an ISO timestamp to a date input value (YYYY-MM-DD)
function isoToDateInput(iso: string): string {
  return iso.slice(0, 10);
}

interface Props {
  initialSpots: SpotRow[];
}

export default function SpotsTable({ initialSpots }: Props) {
  const router = useRouter();
  const [spots, setSpots] = useState<SpotRow[]>(initialSpots);
  const [loading, setLoading] = useState<string | null>(null); // spotId or "add"
  const [error, setError] = useState<string | null>(null);

  // Which spot row is in "set notice date" edit mode
  const [editingNotice, setEditingNotice] = useState<string | null>(null);
  const [noticeDate, setNoticeDate] = useState<string>("");

  // Which spot row is pending delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add spot form
  const [addIdentifier, setAddIdentifier] = useState("");
  const [addType, setAddType] = useState<"car" | "mc">("car");
  const [showAdd, setShowAdd] = useState(false);

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
      // Optimistically update local state so the user sees the change immediately
      setSpots(prev => prev.map(s => {
        if (s.id !== spotId) return s;
        if ("ending_at" in body) {
          const endingAt = (body.ending_at as string | null) ?? null;
          return {
            ...s,
            ending_at: endingAt,
            status: endingAt ? "upcoming" : "occupied",
          };
        }
        if ("available" in body) {
          return {
            ...s,
            available: body.available as boolean,
            status: (body.available as boolean) ? "free" : "unavailable",
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

      // Add new row optimistically
      setSpots(prev => [
        ...prev,
        {
          id: data.id!,
          identifier,
          map_type: addType,
          available: true,
          status: "free",
          resident_name: null,
          assignment_id: null,
          ending_at: null,
          map_x: null,
          preference_count: 0,
        },
      ].sort((a, b) => a.identifier.localeCompare(b.identifier, "sv")));

      setAddIdentifier("");
      setAddType("car");
      setShowAdd(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  function startEditNotice(spot: SpotRow) {
    setEditingNotice(spot.id);
    setNoticeDate(spot.ending_at ? isoToDateInput(spot.ending_at) : "");
  }

  async function saveNotice(spotId: string) {
    if (!noticeDate) return;
    await patch(spotId, { ending_at: dateInputToIso(noticeDate) });
    setEditingNotice(null);
  }

  async function clearNotice(spotId: string) {
    await patch(spotId, { ending_at: null });
  }

  const isDeletable = (s: SpotRow) => s.status === "free" || s.status === "unavailable";
  const isAvailabilityToggleable = (s: SpotRow) => s.status === "free" || s.status === "unavailable";

  return (
    <div>
      {error && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Plats</TableHead>
            <TableHead className="w-20">Typ</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead>Boende</TableHead>
            <TableHead className="w-44">Slutdatum</TableHead>
            <TableHead className="w-24 text-right">Intresserade</TableHead>
            <TableHead className="text-right w-72">Åtgärder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {spots.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-400 py-10">
                Inga platser ännu. Lägg till en plats nedan.
              </TableCell>
            </TableRow>
          )}

          {spots.map(spot => {
            const busy = loading === spot.id;
            const isEditing = editingNotice === spot.id;
            const isConfirmingDelete = confirmDelete === spot.id;

            return (
              <TableRow key={spot.id}>
                <TableCell className="font-mono font-semibold text-gray-900">
                  {spot.identifier}
                </TableCell>

                <TableCell className="text-gray-500 text-sm">
                  {spot.map_type === "mc" ? "MC" : "Bil"}
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant="outline" className={STATUS_CLASS[spot.status]}>
                      {STATUS_LABEL[spot.status]}
                    </Badge>
                    {spot.map_x === null && (
                      <a
                        href="/dashboard/map/editor"
                        className="text-xs text-gray-400 hover:text-blue-600 hover:underline"
                      >
                        Ej placerad på karta →
                      </a>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-sm text-gray-600">
                  {spot.resident_name ?? <span className="text-gray-300">—</span>}
                </TableCell>

                <TableCell className="text-sm text-gray-500">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={noticeDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={e => setNoticeDate(e.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveNotice(spot.id)}
                        disabled={!noticeDate || busy}
                      >
                        Spara
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNotice(null)}
                        disabled={busy}
                      >
                        Avbryt
                      </Button>
                    </div>
                  ) : spot.ending_at ? (
                    formatEndingAt(spot.ending_at)
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </TableCell>

                <TableCell className="text-right text-sm text-gray-500">
                  {Number(spot.preference_count) > 0
                    ? <span className="font-medium text-gray-700">{Number(spot.preference_count)}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </TableCell>

                <TableCell className="text-right">
                  {isConfirmingDelete ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm text-red-700">Ta bort?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(null)}
                        disabled={busy}
                      >
                        Avbryt
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => deleteSpot(spot.id)}
                        disabled={busy}
                      >
                        {busy ? "Tar bort…" : "Bekräfta"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      {/* Set / clear notice date — only for occupied or upcoming spots */}
                      {(spot.status === "occupied" || spot.status === "upcoming") && !isEditing && (
                        <>
                          <button
                            type="button"
                            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                            onClick={() => startEditNotice(spot)}
                            disabled={busy}
                          >
                            {spot.ending_at ? "Ändra datum" : "Ange uppsägningstid"}
                          </button>
                          {spot.ending_at && (
                            <button
                              type="button"
                              className="text-sm text-gray-400 hover:text-gray-600 hover:underline disabled:opacity-50"
                              onClick={() => clearNotice(spot.id)}
                              disabled={busy}
                            >
                              Rensa
                            </button>
                          )}
                        </>
                      )}

                      {/* Toggle availability — only for free or unavailable spots */}
                      {isAvailabilityToggleable(spot) && (
                        <button
                          type="button"
                          className="text-sm text-gray-500 hover:text-gray-800 hover:underline disabled:opacity-50"
                          onClick={() => patch(spot.id, { available: !spot.available })}
                          disabled={busy}
                        >
                          {spot.available ? "Markera otillgänglig" : "Markera tillgänglig"}
                        </button>
                      )}

                      {/* Delete — only for free or unavailable spots */}
                      {isDeletable(spot) && (
                        <button
                          type="button"
                          className="text-sm text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                          onClick={() => setConfirmDelete(spot.id)}
                          disabled={busy}
                        >
                          Ta bort
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

      {/* ── Add spot ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 px-6 py-4">
        {!showAdd ? (
          <button
            type="button"
            className="text-sm font-medium text-blue-600 hover:underline"
            onClick={() => setShowAdd(true)}
          >
            + Lägg till plats
          </button>
        ) : (
          <form onSubmit={addSpot} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="add-identifier" className="text-xs text-gray-500">
                Identifierare
              </Label>
              <Input
                id="add-identifier"
                placeholder="t.ex. A12"
                value={addIdentifier}
                onChange={e => setAddIdentifier(e.target.value)}
                className="w-32"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="add-type" className="text-xs text-gray-500">
                Typ
              </Label>
              <Select value={addType} onValueChange={v => setAddType(v as "car" | "mc")}>
                <SelectTrigger id="add-type" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Bil</SelectItem>
                  <SelectItem value="mc">MC</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" size="sm" disabled={!addIdentifier.trim() || loading === "add"}>
              {loading === "add" ? "Sparar…" : "Lägg till"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setShowAdd(false); setAddIdentifier(""); setAddType("car"); }}
              disabled={loading === "add"}
            >
              Avbryt
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
