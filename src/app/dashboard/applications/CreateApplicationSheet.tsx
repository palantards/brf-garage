"use client";

import { useActionState, useEffect } from "react";
import { createApplicationAction } from "./actions";
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
};

const c = {
  primary: "#0053db",
  primaryDim: "#0048c1",
  onPrimary: "#f8f7ff",
  onSurface: "#2b3437",
  onSurfaceVariant: "#586064",
  outlineVariant: "#abb3b7",
};

export default function CreateApplicationSheet({ open, onClose }: Props) {
  const [state, formAction, pending] = useActionState(
    createApplicationAction,
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
        className="w-[440px] p-0 border-l border-[#abb3b7]/20"
        style={{ fontFamily: "var(--font-inter), sans-serif" }}
      >
        <SheetHeader className="px-8 pt-8 pb-6 border-b border-[#abb3b7]/15">
          <SheetTitle
            className="text-xl font-bold text-[#2b3437]"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Skapa ansökan
          </SheetTitle>
          <p className="text-sm text-[#586064] mt-1">
            Ange den boendes e-postadress. Ett ansökningsformulär skickas
            automatiskt via e-post.
          </p>
        </SheetHeader>

        <form action={formAction} className="px-8 py-6 space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="app-email"
              className="block text-[11px] font-bold uppercase tracking-widest text-[#586064]"
            >
              E-postadress
            </label>
            <Input
              id="app-email"
              name="email"
              type="email"
              required
              placeholder="namn@exempel.se"
              className="border-2 border-[#abb3b7]/30 focus-visible:border-[#0053db] focus-visible:ring-0 rounded-lg px-4 py-3 h-auto text-[#2b3437]"
            />
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
              {pending ? "Skickar..." : "Skicka ansökningsformulär"}
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
