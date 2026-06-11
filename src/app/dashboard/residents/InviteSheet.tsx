"use client";

import { useActionState, useEffect, useState } from "react";
import { inviteResidentAction } from "./actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  open: boolean;
  onClose: () => void;
  adminOnly?: boolean;
};

const c = {
  primary: "#0053db",
  primaryDim: "#0048c1",
  onPrimary: "#f8f7ff",
  onSurface: "#2b3437",
  onSurfaceVariant: "#586064",
  surfaceContainerLowest: "#ffffff",
  outlineVariant: "#abb3b7",
};

export default function InviteSheet({ open, onClose, adminOnly = false }: Props) {
  const [state, formAction, pending] = useActionState(
    inviteResidentAction,
    undefined
  );
  const [role, setRole] = useState<"resident" | "admin">(adminOnly ? "admin" : "resident");

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
        className="w-[440px] p-0 border-l border-[#abb3b7]/20"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <SheetHeader className="px-8 pt-8 pb-6 border-b border-[#abb3b7]/15">
          <SheetTitle
            className="text-xl font-bold text-[#2b3437]"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {adminOnly ? "Bjud in ny admin" : "Bjud in ny boende"}
          </SheetTitle>
          <p className="text-sm text-[#586064] mt-1">
            Fyll i uppgifterna nedan. Den inbjudna personen får ett
            e-postmeddelande med en aktiveringslänk.
          </p>
        </SheetHeader>

        <form action={formAction} className="px-8 py-6 space-y-6">
          {/* Hidden role field */}
          <input type="hidden" name="role" value={role} />

          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="inv-email"
              className="block text-[11px] font-bold uppercase tracking-widest text-[#586064]"
            >
              E-postadress
            </label>
            <Input
              id="inv-email"
              name="email"
              type="email"
              required
              placeholder="namn@exempel.se"
              className="border-2 border-[#abb3b7]/30 focus-visible:border-[#0053db] focus-visible:ring-0 rounded-lg px-4 py-3 h-auto text-[#2b3437]"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label
              htmlFor="inv-name"
              className="block text-[11px] font-bold uppercase tracking-widest text-[#586064]"
            >
              Namn <span className="normal-case font-normal">(valfritt)</span>
            </label>
            <Input
              id="inv-name"
              name="name"
              type="text"
              placeholder="Förnamn Efternamn"
              className="border-2 border-[#abb3b7]/30 focus-visible:border-[#0053db] focus-visible:ring-0 rounded-lg px-4 py-3 h-auto text-[#2b3437]"
            />
          </div>

          {/* Role toggle — hidden when adminOnly */}
          {!adminOnly && (
            <div className="space-y-2">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#586064]">
                Roll
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole("resident")}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold border-2 transition-all"
                  style={
                    role === "resident"
                      ? { background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDim} 100%)`, color: c.onPrimary, borderColor: "transparent" }
                      : { background: "transparent", color: c.onSurface, borderColor: `${c.outlineVariant}66` }
                  }
                >
                  Boende
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold border-2 transition-all"
                  style={
                    role === "admin"
                      ? { background: `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDim} 100%)`, color: c.onPrimary, borderColor: "transparent" }
                      : { background: "transparent", color: c.onSurface, borderColor: `${c.outlineVariant}66` }
                  }
                >
                  Administratör
                </button>
              </div>
            </div>
          )}

          {/* Feedback */}
          {state?.error && (
            <p className="text-sm text-[#9f403d]">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-700">{state.success}</p>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-3">
            <Button
              type="submit"
              disabled={pending}
              className="w-full rounded-full py-6 font-bold text-sm gap-2"
              style={{
                background: pending
                  ? c.outlineVariant
                  : `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDim} 100%)`,
                color: c.onPrimary,
                border: "none",
                boxShadow: pending ? "none" : "0 4px 14px rgba(0,83,219,0.2)",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              {pending ? "Skickar…" : "Skicka inbjudan"}
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
