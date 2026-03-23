"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface OfferCardProps {
  offerId: string;
  spotIdentifier: string;
  spotType: string;
  expiresAt: string;
}

function timeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Utgått";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m kvar`;
  return `${minutes}m kvar`;
}

export default function OfferCard({ offerId, spotIdentifier, spotType, expiresAt }: OfferCardProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(timeLeft(expiresAt));
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(timeLeft(expiresAt));
    }, 30_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expired = new Date(expiresAt).getTime() <= Date.now();

  async function respond(action: "accept" | "decline") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/offers/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Något gick fel");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border-2 border-[#0053db] bg-[#dbe1ff]/30 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#0048bf] mb-1">
            Erbjudande
          </p>
          <p
            className="text-2xl sm:text-3xl font-extrabold text-[#2b3437]"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Plats {spotIdentifier}
          </p>
          <p className="text-sm text-[#586064] mt-1">
            {spotType === "mc" ? "MC-plats" : "Bilplats"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#0053db]/20">
          <span className="material-symbols-outlined text-[#0053db] text-base">timer</span>
          <span className={`text-sm font-bold ${expired ? "text-[#9f403d]" : "text-[#0053db]"}`}>
            {remaining}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {!expired && !confirmDecline && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-[#0053db] hover:bg-[#0048c1] text-white font-bold rounded-lg"
            onClick={() => respond("accept")}
            disabled={loading !== null}
          >
            {loading === "accept" ? "Accepterar…" : "Acceptera"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 font-bold rounded-lg"
            onClick={() => setConfirmDecline(true)}
            disabled={loading !== null}
          >
            Tacka nej
          </Button>
        </div>
      )}

      {!expired && confirmDecline && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-[#9f403d] font-semibold mb-1">
            Vill du verkligen tacka nej?
          </p>
          <p className="text-xs text-[#586064] mb-3">
            Erbjudandet går vidare till nästa person i kön. Du behåller din köplats.
          </p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 font-bold rounded-lg"
              onClick={() => respond("decline")}
              disabled={loading !== null}
            >
              {loading === "decline" ? "Avböjer…" : "Ja, tacka nej"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 font-bold rounded-lg"
              onClick={() => setConfirmDecline(false)}
              disabled={loading !== null}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {expired && (
        <p className="text-sm text-[#9f403d] font-semibold">
          Erbjudandet har gått ut. Det skickas vidare till nästa i kön.
        </p>
      )}
    </div>
  );
}
