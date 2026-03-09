"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteMapButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Ta bort den uppladdade filen och börja om?")) return;
    setLoading(true);
    try {
      await fetch("/api/admin/map/image", { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
    >
      {loading ? "Tar bort…" : "Ta bort uppladdad fil"}
    </button>
  );
}
