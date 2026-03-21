"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "./actions";

interface Props {
  token: string;
  email: string;
  associationName: string;
}

export default function AcceptInviteForm({ token, email, associationName }: Props) {
  const action = acceptInviteAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#f8f9fa" }}
    >
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)" }}
            >
              <span className="material-symbols-outlined text-white text-[20px]">garage</span>
            </div>
            <span
              className="font-extrabold text-2xl tracking-tight text-[#2b3437]"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              BRF Garage
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-xl p-8 md:p-12 relative overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(43,52,55,0.06)" }}
        >
          {/* Decorative top accent */}
          <div
            className="absolute top-0 right-0 w-24 h-1 opacity-80"
            style={{ background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)" }}
          />

          <div className="mb-10 text-center">
            <h1
              className="text-3xl font-bold text-[#2b3437] mb-3 tracking-tight"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Välkommen till BRF Garage
            </h1>
            <p className="text-[#586064] leading-relaxed text-sm">
              Skapa ditt konto för att komma igång.
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            {/* Email (locked) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1">
                E-postadress
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-[#f1f4f6] border-2 border-transparent rounded-xl px-4 py-3.5 text-sm text-[#586064]"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1"
              >
                Ditt namn
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Anna Andersson"
                className="w-full bg-white border-2 border-[#abb3b7]/30 rounded-xl px-4 py-3.5 text-sm text-[#2b3437] placeholder:text-[#abb3b7] outline-none focus:border-[#0053db] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1"
              >
                Lösenord
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full bg-white border-2 border-[#abb3b7]/30 rounded-xl px-4 py-3.5 text-sm text-[#2b3437] placeholder:text-[#abb3b7] outline-none focus:border-[#0053db] transition-colors"
              />
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1"
              >
                Bekräfta lösenord
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="w-full bg-white border-2 border-[#abb3b7]/30 rounded-xl px-4 py-3.5 text-sm text-[#2b3437] placeholder:text-[#abb3b7] outline-none focus:border-[#0053db] transition-colors"
              />
            </div>

            {/* Password hint */}
            <div className="flex items-start gap-2 py-1">
              <span className="material-symbols-outlined text-[#abb3b7] text-[16px] mt-0.5">info</span>
              <p className="text-xs text-[#586064] leading-normal">
                Lösenordet måste vara minst 8 tecken långt.
              </p>
            </div>

            {state?.error && (
              <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              className="w-full text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)",
                boxShadow: "0 8px 24px rgba(0,83,219,0.2)",
              }}
            >
              <span>{pending ? "Aktiverar…" : "Aktivera konto"}</span>
              {!pending && (
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-sm text-[#586064]">
            Inbjuden av{" "}
            <span className="font-semibold text-[#2b3437]">{associationName}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
