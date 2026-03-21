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

  return (
    <aside
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
        {items.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
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
                color: isActive ? c.primary : c.onSurfaceVariant,
                backgroundColor: isActive ? c.surfaceContainerLow : "transparent",
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                transition: "background 150ms, color 150ms",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
