"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function UploadMapModal() {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/map/image", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Uppladdningen misslyckades");
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Uppladdningen misslyckades");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    upload(files[0]);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Ladda upp garageplan
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Ladda upp garageplan</h2>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500">
              Ladda upp en bild på din garageplan (PNG, JPG eller WebP).
              Vi konfigurerar kartan åt dig och meddelar dig när den är klar att granska.
            </p>

            <div
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
                dragging
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <p className="text-sm text-gray-500">Laddar upp…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Dra och släpp en bild här</p>
                  <p className="text-xs text-gray-400 mt-1">eller klicka för att välja fil</p>
                  <p className="text-xs text-gray-400 mt-3">PNG, JPG, WebP</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={e => handleFiles(e.target.files)}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
