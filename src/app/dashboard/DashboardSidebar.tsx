"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/ThemeProvider";

const adminItems = [
  { href: "/dashboard", icon: "dashboard", label: "Översikt" },
  { href: "/dashboard/queue", icon: "format_list_numbered", label: "Kö" },
  { href: "/dashboard/residents", icon: "group", label: "Boende" },
  { href: "/dashboard/applications", icon: "description", label: "Ansökningar" },
  { href: "/dashboard/spots", icon: "directions_car", label: "Platser" },
  { href: "/dashboard/map", icon: "map", label: "Garageplan" },
  { href: "/dashboard/audit-log", icon: "history", label: "Händelselogg" },
  { href: "/dashboard/settings", icon: "settings", label: "Inställningar" },
];

const residentItems = [
  { href: "/dashboard", icon: "dashboard", label: "Översikt" },
  { href: "/dashboard/map", icon: "map", label: "Garageplan" },
];

export default function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const items = isAdmin ? adminItems : residentItems;

  const c = dark
    ? {
        bg: "#1e2d4a",
        border: "rgba(255,255,255,0.08)",
        primary: "#b0c6ff",
        onSurface: "#e4e9eb",
        onSurfaceMuted: "#8d909f",
        activeBg: "rgba(255,255,255,0.08)",
      }
    : {
        bg: "var(--brf-bg)",
        border: "var(--brf-border)",
        primary: "var(--brf-primary)",
        onSurface: "var(--brf-on-surface)",
        onSurfaceMuted: "var(--brf-on-surface-muted)",
        activeBg: "var(--brf-surface-low)",
      };

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden sm:flex flex-col"
        style={{
          height: "100vh",
          width: 256,
          position: "fixed",
          left: 0,
          top: 0,
          backgroundColor: c.bg,
          borderRight: `1px solid ${c.border}`,
          zIndex: 40,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <div style={{ padding: "0 24px", height: 64, display: "flex", alignItems: "center", borderBottom: `1px solid ${c.border}` }}>
          <span
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: c.onSurface,
              letterSpacing: "-0.02em",
            }}
          >
            BRF Garage
          </span>
        </div>

        <div style={{ padding: "20px 24px 12px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: c.onSurfaceMuted, margin: 0 }}>
            {isAdmin ? "Administration" : "Min portal"}
          </p>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 12px" }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                textDecoration: "none",
                color: isActive(item.href) ? c.primary : c.onSurfaceMuted,
                backgroundColor: isActive(item.href) ? c.activeBg : "transparent",
                fontWeight: isActive(item.href) ? 700 : 500,
                fontSize: 14,
                transition: "background 150ms, color 150ms",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex"
        style={{ backgroundColor: c.bg, borderTop: `1px solid ${c.border}` }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              style={{ color: active ? c.primary : c.onSurfaceMuted }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
