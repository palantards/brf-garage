"use client";

import { useActionState, useState } from "react";
import { submitApplicationAction } from "./actions";

interface Props {
  token: string;
  email: string;
  associationName: string;
}

const labelClass = "block text-[11px] font-bold uppercase tracking-widest text-[#586064] ml-1";
const inputClass = "w-full bg-white border-2 border-[#abb3b7]/30 rounded-xl px-4 py-3.5 text-sm text-[#2b3437] placeholder:text-[#abb3b7] outline-none focus:border-[#0053db] transition-colors";

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 cursor-pointer rounded-xl px-4 py-3 border-2 text-sm font-medium transition-colors"
          style={{
            borderColor: value === opt.value ? "#0053db" : "rgba(171,179,183,0.3)",
            backgroundColor: value === opt.value ? "#f0f4ff" : "white",
            color: value === opt.value ? "#0053db" : "#586064",
          }}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.icon && (
            <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
          )}
          {opt.label}
        </label>
      ))}
    </div>
  );
}

export default function ApplicationForm({ token, email, associationName }: Props) {
  const action = submitApplicationAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [spotType, setSpotType] = useState("car");
  const [agreementType, setAgreementType] = useState("permanent");
  const [startPref, setStartPref] = useState("asap");

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
              style={{ background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" }}
            />
            <span className="material-symbols-outlined text-[#16a34a] text-5xl mb-4 block">
              check_circle
            </span>
            <h1
              className="text-2xl font-bold text-[#2b3437] mb-2"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Ansökan skickad!
            </h1>
            <p className="text-[#586064] text-sm leading-relaxed">
              Tack för din ansökan. Styrelsen kommer att granska den och
              återkommer via e-post.
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
            style={{ background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)" }}
          />

          <div className="mb-10 text-center">
            <h1
              className="text-3xl font-bold text-[#2b3437] mb-3 tracking-tight"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Ansök om garageplats
            </h1>
            <p className="text-[#586064] leading-relaxed text-sm">
              Fyll i formuläret nedan för att ansöka om en plats.
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            {/* Email (locked) */}
            <div className="space-y-2">
              <label className={labelClass}>E-postadress</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-[#f1f4f6] border-2 border-transparent rounded-xl px-4 py-3.5 text-sm text-[#586064]"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className={labelClass}>Namn</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Anna Andersson"
                className={inputClass}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className={labelClass}>Telefonnummer</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="070-123 45 67"
                className={inputClass}
              />
            </div>

            {/* Apartment number */}
            <div className="space-y-2">
              <label htmlFor="apartmentNumber" className={labelClass}>Lägenhetsnummer</label>
              <input
                id="apartmentNumber"
                name="apartmentNumber"
                type="text"
                placeholder="1201"
                className={inputClass}
              />
            </div>

            {/* Spot type */}
            <div className="space-y-2">
              <label className={labelClass}>Platstyp</label>
              <input type="hidden" name="spotType" value={spotType} />
              <RadioGroup
                name="spotType_radio"
                value={spotType}
                onChange={setSpotType}
                options={[
                  { value: "car", label: "Bil", icon: "directions_car" },
                  { value: "mc", label: "MC", icon: "two_wheeler" },
                  { value: "electric", label: "Elbil", icon: "ev_station" },
                ]}
              />
            </div>

            {/* Agreement type */}
            <div className="space-y-2">
              <label className={labelClass}>Avtalstyp</label>
              <input type="hidden" name="agreementType" value={agreementType} />
              <RadioGroup
                name="agreementType_radio"
                value={agreementType}
                onChange={setAgreementType}
                options={[
                  { value: "permanent", label: "Permanent" },
                  { value: "temporary", label: "Tillfälligt" },
                ]}
              />
            </div>

            {/* Start preference */}
            <div className="space-y-2">
              <label className={labelClass}>Önskat startdatum</label>
              <input type="hidden" name="startPreference" value={startPref} />
              <RadioGroup
                name="startPref_radio"
                value={startPref}
                onChange={setStartPref}
                options={[
                  { value: "asap", label: "Så snart som möjligt" },
                  { value: "specific_date", label: "Specifikt datum" },
                ]}
              />
              {startPref === "specific_date" && (
                <input
                  name="startDate"
                  type="date"
                  required
                  className={inputClass + " mt-2"}
                />
              )}
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
                background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)",
                boxShadow: "0 8px 24px rgba(0,83,219,0.2)",
              }}
            >
              <span>{pending ? "Skickar..." : "Skicka ansökan"}</span>
              {!pending && (
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              )}
            </button>
          </form>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-sm text-[#586064]">
            Ansökan till{" "}
            <span className="font-semibold text-[#2b3437]">{associationName}</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
