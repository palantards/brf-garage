"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const c = {
  primary: "#0053db",
  onSurface: "#2b3437",
  onSurfaceVariant: "#586064",
  surfaceContainerLow: "#f1f4f6",
};

const adminItems = [
  { href: "/dashboard", icon: "dashboard", label: "Översikt" },
  { href: "/dashboard/queue", icon: "format_list_numbered", label: "Kö" },
  { href: "/dashboard/residents", icon: "group", label: "Boende" },
  { href: "/dashboard/spots", icon: "directions_car", label: "Platser" },
  { href: "/dashboard/map", icon: "map", label: "Garageplan" },
];

const residentItems = [
  { href: "/dashboard", icon: "dashboard", label: "Översikt" },
  { href: "/dashboard/map", icon: "map", label: "Garageplan" },
];

export default function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? adminItems : residentItems;

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
          paddingTop: 64,
          backgroundColor: "#f8f9fa",
          borderRight: "1px solid rgba(43,52,55,0.08)",
          zIndex: 40,
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <div style={{ padding: "28px 24px 20px" }}>
          <div
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: c.onSurface,
              marginBottom: 4,
            }}
          >
            {isAdmin ? "Administration" : "Min portal"}
          </div>
          <p style={{ fontSize: 12, color: c.onSurfaceVariant, margin: 0 }}>
            BRF Styrelseportal
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
                color: isActive(item.href) ? c.primary : c.onSurfaceVariant,
                backgroundColor: isActive(item.href) ? c.surfaceContainerLow : "transparent",
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
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#abb3b7]/20 flex">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
              style={{ color: active ? c.primary : c.onSurfaceVariant }}
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
