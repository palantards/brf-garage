"use client";

import { useTheme } from "@/lib/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2 rounded-full transition-colors hover:bg-[var(--brf-surface-high)]"
      style={{ color: "var(--brf-on-surface-muted)" }}
      title={theme === "dark" ? "Byt till ljust läge" : "Byt till mörkt läge"}
      aria-label={theme === "dark" ? "Byt till ljust läge" : "Byt till mörkt läge"}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
