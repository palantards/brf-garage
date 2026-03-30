"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
  offerDeadlineHours: number;
  evPriorityOnly: boolean;
}

export default function SettingsForm({ offerDeadlineHours, evPriorityOnly }: Props) {
  const [deadline, setDeadline] = useState(offerDeadlineHours);
  const [evPriority, setEvPriority] = useState(evPriorityOnly);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(field: string, body: Record<string, unknown>) {
    setSaving(field);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Något gick fel");
      }
      setSuccess(field);
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-[#9f403d]">
          {error}
        </div>
      )}

      {/* Offer deadline */}
      <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
            Erbjudande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="deadline" className="text-sm font-medium text-[var(--brf-on-surface)]">
              Svarstid (timmar)
            </Label>
            <p className="text-xs text-[var(--brf-on-surface-muted)]">
              Hur lång tid en boende har på sig att svara på ett erbjudande.
            </p>
            <div className="flex items-center gap-3">
              <Input
                id="deadline"
                type="number"
                min={1}
                max={720}
                value={deadline}
                onChange={e => setDeadline(Number(e.target.value))}
                className="w-24 border-2 border-[var(--brf-muted)]/30 focus-visible:border-[var(--brf-primary)] focus-visible:ring-0 rounded-xl"
              />
              <span className="text-sm text-[var(--brf-on-surface-muted)]">timmar</span>
              <Button
                type="button"
                size="sm"
                onClick={() => save("deadline", { offer_deadline_hours: deadline })}
                disabled={saving === "deadline" || deadline === offerDeadlineHours}
                className="bg-[var(--brf-primary)] hover:bg-[var(--brf-primary-dim)] text-white rounded-lg"
              >
                {saving === "deadline" ? "Sparar…" : success === "deadline" ? "Sparat!" : "Spara"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EV priority */}
      <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
            Elbilsplatser
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--brf-on-surface)]">
                  Prioritera elbilsägare
                </p>
                <p className="text-xs text-[var(--brf-on-surface-muted)] max-w-md">
                  {evPriority
                    ? "Elbilsplatser erbjuds först till boende med elbil. Om ingen elbilsägare finns i kön erbjuds platsen till alla bilägare."
                    : "Elbilsplatser erbjuds till alla bilägare utan prioritering."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={evPriority}
                onClick={() => {
                  const next = !evPriority;
                  setEvPriority(next);
                  save("ev", { ev_priority_only: next });
                }}
                disabled={saving === "ev"}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                  evPriority ? "bg-[var(--brf-primary)]" : "bg-[var(--brf-muted)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    evPriority ? "translate-x-[22px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
            {success === "ev" && (
              <p className="text-xs font-semibold text-emerald-600">Sparat!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
