"use client";

import { useActionState } from "react";
import { confirmResignationAction } from "./actions";

interface Props {
  token: string;
  email: string;
  residentName: string | null;
  spotIdentifier: string;
  agreementType: string;
  associationName: string;
}

const AGREEMENT_LABELS: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Tillfälligt",
};

const inputClass = "w-full bg-white border-2 border-[#abb3b7]/30 rounded-xl px-4 py-3.5 text-sm text-[#2b3437] placeholder:text-[#abb3b7] outline-none focus:border-[#0053db] transition-colors";

export default function ResignationForm({
  token,
  email,
  residentName,
  spotIdentifier,
  agreementType,
  associationName,
}: Props) {
  const action = confirmResignationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  const noticePeriod = agreementType === "temporary" ? "1 månad" : "3 månader";

  if (state?.success) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="w-full max-w-md">
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
          <div
            className="bg-white rounded-xl p-10 text-center relative overflow-hidden"
            style={{ boxShadow: "0 12px 32px rgba(43,52,55,0.06)" }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-1 opacity-80"
              style={{ background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)" }}
            />
            <span className="material-symbols-outlined text-[#0053db] text-5xl mb-4 block">
              check_circle
            </span>
            <h1
              className="text-2xl font-bold text-[#2b3437] mb-2"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Uppsägning bekräftad
            </h1>
            <p className="text-[#586064] text-sm leading-relaxed">
              Din uppsägning av plats <strong>{spotIdentifier}</strong> har
              registrerats. Styrelsen kommer att granska den och återkommer
              via e-post.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#f8f9fa" }}
    >
      <div className="w-full max-w-md">
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

        <div
          className="bg-white rounded-xl p-8 md:p-12 relative overflow-hidden"
          style={{ boxShadow: "0 12px 32px rgba(43,52,55,0.06)" }}
        >
          <div
            className="absolute top-0 right-0 w-24 h-1 opacity-80"
            style={{ background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)" }}
          />

          <div className="mb-8 text-center">
            <h1
              className="text-3xl font-bold text-[#2b3437] mb-3 tracking-tight"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Uppsägning av garageplats
            </h1>
            <p className="text-[#586064] leading-relaxed text-sm">
              Bekräfta att du vill säga upp din plats.
            </p>
          </div>

          {/* Spot info card */}
          <div className="bg-[#f8f9fa] rounded-xl p-5 mb-8 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064]">Plats</span>
              <span className="text-sm font-bold text-[#2b3437]">{spotIdentifier}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064]">Avtalstyp</span>
              <span className="text-sm font-medium text-[#2b3437]">{AGREEMENT_LABELS[agreementType] || agreementType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064]">Uppsägningstid</span>
              <span className="text-sm font-semibold text-[#dc2626]">{noticePeriod}</span>
            </div>
            {residentName && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064]">Namn</span>
                <span className="text-sm font-medium text-[#2b3437]">{residentName}</span>
              </div>
            )}
          </div>

          <form action={formAction} className="space-y-6">
            {/* Reason (optional) */}
            <div className="space-y-2">
              <label htmlFor="reason" className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1">
                Anledning <span className="normal-case font-normal">(valfritt)</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                placeholder="Ange anledning till uppsägningen..."
                className={inputClass + " resize-none"}
              />
            </div>

            {/* Preferred end date (optional) */}
            <div className="space-y-2">
              <label htmlFor="preferredEndDate" className="block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1">
                Önskat slutdatum <span className="normal-case font-normal">(valfritt)</span>
              </label>
              <input
                id="preferredEndDate"
                name="preferredEndDate"
                type="date"
                className={inputClass}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-[#9f403d] bg-red-50 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 mt-2 disabled:opacity-60 transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                boxShadow: "0 8px 24px rgba(220,38,38,0.2)",
              }}
            >
              <span>{pending ? "Bekräftar..." : "Bekräfta uppsägning"}</span>
              {!pending && (
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              )}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-[#586064]">
            Uppsägning hos{" "}
            <span className="font-semibold text-[#2b3437]">{associationName}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
