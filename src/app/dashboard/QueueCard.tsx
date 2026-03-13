"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type UpcomingSpot = {
  identifier: string;
  map_type: string;
  ending_at: string;
};

type Props = {
  position: number | null;    // null = not in queue
  joinedAt: string | null;    // ISO string
  hasAssignment: boolean;
  upcomingSpots: UpcomingSpot[];
};

export default function QueueCard({ position, joinedAt, hasAssignment, upcomingSpots }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/join", { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Något gick fel");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  async function leave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/queue/leave", { method: "POST" });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Något gick fel");
      }
      setConfirmLeave(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  const joinedDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  if (hasAssignment) {
    return <p className="text-sm text-gray-500">Du har redan en tilldelad plats.</p>;
  }

  if (position !== null && joinedAt) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">#{position}</p>
          <p className="text-sm text-gray-500">i kön sedan {joinedDate}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {confirmLeave ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="text-sm text-red-800 font-medium">Är du säker på att du vill lämna kön?</p>
            <p className="text-xs text-red-600">Du förlorar din köplats och hamnar sist om du går med igen.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmLeave(false)}
                disabled={loading}
              >
                Avbryt
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={leave}
                disabled={loading}
              >
                {loading ? "Lämnar…" : "Ja, lämna kön"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            Lämna kön
          </button>
        )}

        {/* Upcoming spots — only shown when in queue */}
        {upcomingSpots.length > 0 && (
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Kommande lediga platser</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400">
                  <th className="pb-1 font-medium">Plats</th>
                  <th className="pb-1 font-medium">Typ</th>
                  <th className="pb-1 font-medium text-right">Beräknat ledigt</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSpots.map(s => (
                  <tr key={s.identifier} className="border-t border-gray-50">
                    <td className="py-1 font-mono font-semibold text-gray-800">{s.identifier}</td>
                    <td className="py-1 text-gray-500">{s.map_type === "mc" ? "MC" : "Bil"}</td>
                    <td className="py-1 text-right text-orange-600">
                      {new Date(s.ending_at).toLocaleDateString("sv-SE", {
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">Du står inte i kön just nu.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" size="sm" onClick={join} disabled={loading}>
        {loading ? "Anmäler…" : "Gå med i kön"}
      </Button>
    </div>
  );
}
