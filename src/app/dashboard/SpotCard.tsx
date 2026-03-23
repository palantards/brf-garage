"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SpotCardProps {
  spotIdentifier: string;
  spotType: string;
  endingAt: string | null;
}

export default function SpotCard({ spotIdentifier, spotType, endingAt }: SpotCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resign() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/spots/resign", { method: "POST" });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Något gick fel");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  const endDate = endingAt
    ? new Date(endingAt).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-[#dbe1ff] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#0053db]">
            {spotType === "mc" ? "two_wheeler" : "directions_car"}
          </span>
        </div>
        <div>
          <p
            className="text-2xl font-extrabold text-[#2b3437]"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {spotIdentifier}
          </p>
          <p className="text-sm text-[#586064]">
            {spotType === "mc" ? "MC-plats" : "Bilplats"}
          </p>
        </div>
      </div>

      {endDate && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
          <p className="text-sm text-amber-800 font-semibold">
            Uppsagd — sista dag {endDate}
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {!endingAt && !confirming && (
        <Button
          variant="outline"
          className="text-[#586064] font-semibold rounded-lg"
          onClick={() => setConfirming(true)}
        >
          Säg upp plats
        </Button>
      )}

      {!endingAt && confirming && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-[#9f403d] font-semibold mb-1">
            Vill du säga upp din plats?
          </p>
          <p className="text-xs text-[#586064] mb-3">
            Uppsägningstiden är 3 månader. Du kan inte ångra detta.
          </p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 font-bold rounded-lg"
              onClick={resign}
              disabled={loading}
            >
              {loading ? "Säger upp…" : "Ja, säg upp"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-lg"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
