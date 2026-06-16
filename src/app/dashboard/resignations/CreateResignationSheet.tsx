"use client";

import { useActionState, useEffect } from "react";
import { createResignationAction } from "./actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Assignment {
  id: string;
  spot_identifier: string;
  user_name: string | null;
  user_email: string;
  agreement_type: string;
}

type Props = {
  open: boolean;
  onClose: () => void;
  assignments: Assignment[];
};

const AGREEMENT_LABELS: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Tillfälligt",
};

const c = {
  primary: "#0053db",
  primaryDim: "#0048c1",
  onPrimary: "#f8f7ff",
  outlineVariant: "#abb3b7",
};

export default function CreateResignationSheet({ open, onClose, assignments }: Props) {
  const [state, formAction, pending] = useActionState(
    createResignationAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state?.success, onClose]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-[480px] p-0 border-l border-[#abb3b7]/20"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <SheetHeader className="px-8 pt-8 pb-6 border-b border-[#abb3b7]/15">
          <SheetTitle
            className="text-xl font-bold text-[#2b3437]"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Skapa uppsägning
          </SheetTitle>
          <p className="text-sm text-[#586064] mt-1">
            Välj den tilldelning som ska sägas upp. Ett bekräftelseformulär
            skickas automatiskt till den boende.
          </p>
        </SheetHeader>

        <form action={formAction} className="px-8 py-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="res-assignment"
              className="block text-[11px] font-bold uppercase tracking-widest text-[#586064]"
            >
              Tilldelning
            </label>
            {assignments.length === 0 ? (
              <p className="text-sm text-[#586064] italic py-2">
                Det finns inga aktiva tilldelningar att säga upp.
              </p>
            ) : (
              <select
                id="res-assignment"
                name="assignmentId"
                required
                className="w-full bg-white border-2 border-[#abb3b7]/30 rounded-lg px-4 py-3 h-auto text-sm text-[#2b3437] outline-none focus:border-[#0053db] transition-colors"
              >
                <option value="">Välj tilldelning...</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.spot_identifier} — {a.user_name || a.user_email} ({AGREEMENT_LABELS[a.agreement_type] || a.agreement_type})
                  </option>
                ))}
              </select>
            )}
          </div>

          {state?.error && (
            <p className="text-sm text-[#9f403d]">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-700">{state.success}</p>
          )}

          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              disabled={pending || assignments.length === 0}
              className="w-full rounded-full py-6 font-bold text-sm gap-2"
              style={{
                background: pending || assignments.length === 0
                  ? c.outlineVariant
                  : `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDim} 100%)`,
                color: c.onPrimary,
                border: "none",
                boxShadow: pending ? "none" : "0 4px 14px rgba(0,83,219,0.2)",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              {pending ? "Skickar..." : "Skicka uppsägningsformulär"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-sm text-[#586064] hover:text-[#2b3437] transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
