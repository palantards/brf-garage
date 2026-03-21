"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

// Stitch design tokens — Login screen
const c = {
  primary: "#0053db",
  primaryDim: "#0048c1",
  onPrimary: "#f8f7ff",
  onSurface: "#2b3437",
  onSurfaceVariant: "#586064",
  surface: "#f8f9fa",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f1f4f6",
  surfaceContainerHigh: "#e2e9ec",
  outlineVariant: "#abb3b7",
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div
      style={{
        fontFamily: "var(--font-inter), sans-serif",
        backgroundColor: c.surface,
        color: c.onSurface,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 50,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.surface,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: c.onSurface,
            letterSpacing: "-0.04em",
          }}
        >
          BRF Garage
        </span>
      </header>

      {/* Main */}
      <main
        style={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 16px 96px",
        }}
      >
        {/* Login card */}
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            backgroundColor: c.surfaceContainerLowest,
            borderRadius: 16,
            padding: "48px",
            boxShadow: "0 12px 32px rgba(43,52,55,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative accent corner */}
          <div
            style={{
              position: "absolute",
              top: -64,
              right: -64,
              width: 128,
              height: 128,
              backgroundColor: c.surfaceContainerLow,
              borderRadius: "0 0 0 100%",
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Card header */}
            <div style={{ marginBottom: 40 }}>
              <h1
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: c.onSurface,
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                }}
              >
                Logga in på ditt konto
              </h1>
              <p style={{ fontSize: 14, color: c.onSurfaceVariant, margin: 0 }}>
                Välkommen tillbaka till förvaltningen.
              </p>
            </div>

            <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label
                  htmlFor="email"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: c.onSurfaceVariant,
                    marginLeft: 4,
                  }}
                >
                  E-postadress
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="namn@exempel.se"
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    backgroundColor: c.surfaceContainerLowest,
                    border: `2px solid ${c.outlineVariant}33`,
                    borderRadius: 8,
                    fontSize: 14,
                    color: c.onSurface,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 200ms",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = c.primary)}
                  onBlur={(e) => (e.target.style.borderColor = `${c.outlineVariant}33`)}
                />
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    padding: "0 4px",
                  }}
                >
                  <label
                    htmlFor="password"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: c.onSurfaceVariant,
                    }}
                  >
                    Lösenord
                  </label>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    backgroundColor: c.surfaceContainerLowest,
                    border: `2px solid ${c.outlineVariant}33`,
                    borderRadius: 8,
                    fontSize: 14,
                    color: c.onSurface,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 200ms",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = c.primary)}
                  onBlur={(e) => (e.target.style.borderColor = `${c.outlineVariant}33`)}
                />
              </div>

              {/* Error */}
              {state?.error && (
                <p style={{ fontSize: 13, color: "#9f403d", margin: 0 }}>
                  {state.error}
                </p>
              )}

              {/* Submit */}
              <div style={{ paddingTop: 8 }}>
                <button
                  type="submit"
                  disabled={pending}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    background: pending
                      ? c.outlineVariant
                      : `linear-gradient(135deg, ${c.primary} 0%, ${c.primaryDim} 100%)`,
                    color: c.onPrimary,
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 9999,
                    border: "none",
                    cursor: pending ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: pending ? "none" : "0 4px 14px rgba(0,83,219,0.2)",
                    transition: "all 200ms",
                  }}
                >
                  <span>{pending ? "Loggar in…" : "Logga in"}</span>
                  {!pending && (
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      arrow_forward
                    </span>
                  )}
                </button>
              </div>
            </form>

            {/* Security note */}
            <div
              style={{
                marginTop: 48,
                paddingTop: 32,
                borderTop: `1px solid ${c.surfaceContainerLow}`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: c.surfaceContainerHigh,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: c.primary }}>
                  lock
                </span>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: c.onSurfaceVariant,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Din anslutning är krypterad och säker. Endast behörig personal
                har tillgång till garagehanteringen.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          paddingBottom: 24,
          zIndex: 10,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: `${c.onSurface}80`,
          }}
        >
          © {new Date().getFullYear()} BRF Garage
        </span>
      </footer>
    </div>
  );
}
