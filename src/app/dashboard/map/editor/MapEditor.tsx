"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EditorSpot {
  id: string;
  label: string;
  ocr: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleDir = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";
const HANDLES: HandleDir[] = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];

function r(n: number) { return Math.round(n * 100) / 100; }

function computePct(e: MouseEvent | React.MouseEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width * 100,
    y: (e.clientY - rect.top) / rect.height * 100,
  };
}

function spotBg(sp: EditorSpot) {
  if (!sp.label) return "rgba(239,68,68,0.60)";
  if (sp.ocr)   return "rgba(234,179,8,0.75)";
  return "rgba(34,197,94,0.70)";
}

function handleStyle(dir: HandleDir): React.CSSProperties {
  const v = dir.includes("n") ? { top: -4 } : dir.includes("s") ? { bottom: -4 } : { top: "calc(50% - 4px)" };
  const h = dir.includes("w") ? { left: -4 } : dir.includes("e") ? { right: -4 } : { left: "calc(50% - 4px)" };
  return {
    position: "absolute", width: 8, height: 8,
    background: "#fff", border: "1.5px solid #1e293b", borderRadius: 2,
    cursor: `${dir}-resize`, zIndex: 20, ...v, ...h,
  };
}

export default function MapEditor({
  initialSpots,
  initialImageUrl,
}: {
  initialSpots: EditorSpot[];
  initialImageUrl: string | null;
}) {
  const [spots, setSpots] = useState<EditorSpot[]>(initialSpots);
  const [selected, setSelected] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [aspectRatio, setAspectRatio] = useState(52.69);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs — used by mouse handlers to avoid stale closures
  const containerRef = useRef<HTMLDivElement>(null);
  const spotsRef = useRef(spots);
  const selectedRef = useRef<string | null>(null);
  const nextIdRef = useRef(initialSpots.length + 1);
  const resizingRef = useRef<{ spId: string; dir: HandleDir; start: { x: number; y: number }; orig: EditorSpot } | null>(null);
  const movingRef   = useRef<{ spId: string; start: { x: number; y: number }; orig: EditorSpot; moved: boolean } | null>(null);
  const drawingRef  = useRef<{ start: { x: number; y: number } } | null>(null);

  // Keep spotsRef in sync with state (but not during active drag — see mouseup)
  useEffect(() => { spotsRef.current = spots; }, [spots]);

  // ── Select ────────────────────────────────────────────────────────────────
  function selectSpot(id: string | null) {
    selectedRef.current = id;
    setSelected(id);
    const sp = spotsRef.current.find(s => s.id === id);
    setLabelInput(sp?.label ?? "");
  }

  // ── Document-level mouse handlers ─────────────────────────────────────────
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return;

      if (resizingRef.current) {
        const { spId, dir, start, orig } = resizingRef.current;
        const cur = computePct(e, containerRef.current);
        const dx = cur.x - start.x, dy = cur.y - start.y;
        let nx = orig.x, ny = orig.y, nw = orig.width, nh = orig.height;
        if (dir.includes("w")) { nx = orig.x + dx; nw = orig.width  - dx; }
        if (dir.includes("e")) { nw = orig.width  + dx; }
        if (dir.includes("n")) { ny = orig.y + dy; nh = orig.height - dy; }
        if (dir.includes("s")) { nh = orig.height + dy; }
        if (nw < 0.5) { nw = 0.5; if (dir.includes("w")) nx = orig.x + orig.width  - 0.5; }
        if (nh < 0.5) { nh = 0.5; if (dir.includes("n")) ny = orig.y + orig.height - 0.5; }
        const sp = spotsRef.current.find(s => s.id === spId)!;
        sp.x = r(nx); sp.y = r(ny); sp.width = r(nw); sp.height = r(nh);
        const el = containerRef.current.querySelector<HTMLElement>(`[data-id="${spId}"]`);
        if (el) {
          el.style.left = sp.x + "%"; el.style.top    = sp.y + "%";
          el.style.width = sp.width + "%"; el.style.height = sp.height + "%";
        }
        return;
      }

      if (movingRef.current) {
        const { spId, start, orig } = movingRef.current;
        const cur = computePct(e, containerRef.current);
        const dx = cur.x - start.x, dy = cur.y - start.y;
        if (!movingRef.current.moved && Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) return;
        movingRef.current.moved = true;
        const sp = spotsRef.current.find(s => s.id === spId)!;
        sp.x = r(orig.x + dx); sp.y = r(orig.y + dy);
        const el = containerRef.current.querySelector<HTMLElement>(`[data-id="${spId}"]`);
        if (el) { el.style.left = sp.x + "%"; el.style.top = sp.y + "%"; }
        return;
      }

      if (drawingRef.current) {
        const cur = computePct(e, containerRef.current);
        setDrawPreview({
          x: Math.min(drawingRef.current.start.x, cur.x),
          y: Math.min(drawingRef.current.start.y, cur.y),
          w: Math.abs(cur.x - drawingRef.current.start.x),
          h: Math.abs(cur.y - drawingRef.current.start.y),
        });
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (resizingRef.current || movingRef.current) {
        resizingRef.current = null;
        movingRef.current = null;
        setSpots([...spotsRef.current]);
        return;
      }
      if (drawingRef.current) {
        if (!containerRef.current) return;
        const cur = computePct(e, containerRef.current);
        const x = r(Math.min(drawingRef.current.start.x, cur.x));
        const y = r(Math.min(drawingRef.current.start.y, cur.y));
        const w = r(Math.abs(cur.x - drawingRef.current.start.x));
        const h = r(Math.abs(cur.y - drawingRef.current.start.y));
        drawingRef.current = null;
        setDrawPreview(null);
        if (w < 0.3 || h < 0.3) return;
        const id = String(nextIdRef.current++);
        const newSpot: EditorSpot = { id, label: "", ocr: false, x, y, width: w, height: h };
        spotsRef.current = [...spotsRef.current, newSpot];
        setSpots(spotsRef.current);
        selectSpot(id);
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // empty — all state accessed via refs

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        e.preventDefault(); deleteSelected();
      } else if (e.key === "v" || e.key === "V") { splitSelected("v"); }
        else if (e.key === "h" || e.key === "H") { splitSelected("h"); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────
  function deleteSelected() {
    const id = selectedRef.current;
    if (!id) return;
    spotsRef.current = spotsRef.current.filter(s => s.id !== id);
    setSpots(spotsRef.current);
    selectSpot(null);
  }

  function splitSelected(axis: "v" | "h") {
    const id = selectedRef.current;
    if (!id) return;
    const idx = spotsRef.current.findIndex(s => s.id === id);
    if (idx === -1) return;
    const sp = spotsRef.current[idx];
    const newId = String(nextIdRef.current++);
    let a: EditorSpot, b: EditorSpot;
    if (axis === "v") {
      const half = r(sp.width / 2);
      a = { ...sp, width: half };
      b = { ...sp, id: newId, label: "", ocr: false, x: r(sp.x + half), width: half };
    } else {
      const half = r(sp.height / 2);
      a = { ...sp, height: half };
      b = { ...sp, id: newId, label: "", ocr: false, y: r(sp.y + half), height: half };
    }
    spotsRef.current = [...spotsRef.current.slice(0, idx), a, b, ...spotsRef.current.slice(idx + 1)];
    setSpots(spotsRef.current);
    selectSpot(newId);
  }

  function confirmAllOcr() {
    setSpots(prev => prev.map(s => s.ocr ? { ...s, ocr: false } : s));
  }

  function handleLabelChange(val: string) {
    setLabelInput(val);
    const id = selectedRef.current;
    if (!id) return;
    const sp = spotsRef.current.find(s => s.id === id);
    if (sp) { sp.label = val; sp.ocr = false; }
    setSpots(prev => prev.map(s => s.id === id ? { ...s, label: val, ocr: false } : s));
  }

  function tabToNext() {
    const needsReview = (s: EditorSpot) => !s.label || s.ocr;
    const idx = spotsRef.current.findIndex(s => s.id === selectedRef.current);
    const next = spotsRef.current.slice(idx + 1).find(needsReview) ?? spotsRef.current.find(needsReview);
    if (next) selectSpot(next.id);
  }

  function handleImport() {
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) throw new Error();
      const imported: EditorSpot[] = parsed.map((s: Record<string, unknown>) => ({
        id: String(nextIdRef.current++),
        label: String(s.label ?? ""),
        ocr: Boolean(s.ocr),
        x: Number(s.x), y: Number(s.y),
        width: Number(s.width), height: Number(s.height),
      }));
      spotsRef.current = imported;
      setSpots(imported);
      setImportOpen(false);
      setImportText("");
    } catch {
      alert("Ogiltigt JSON. Klistra in resultatet från: python3 scripts/detect_spots.py bild.png --format json");
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/map/image", { method: "POST", body: form });
      if (!res.ok) throw new Error();
      const { url } = await res.json() as { url: string };
      setImageUrl(url);
    } catch {
      alert("Uppladdningen misslyckades. Kontrollera att BLOB_READ_WRITE_TOKEN är konfigurerat.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/admin/map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageUrl || null,
          spots: spots.map(s => ({ label: s.label, x: s.x, y: s.y, width: s.width, height: s.height })),
        }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const confirmed = spots.filter(s => s.label && !s.ocr).length;
  const ocrGuesses = spots.filter(s => s.ocr).length;

  return (
    <div className="space-y-0 rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">

      {/* ── Toolbar ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex flex-wrap gap-2 items-center">

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">Bild</span>
          <Input
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="/garage-mock.png eller https://…"
            className="h-7 text-xs w-56"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Laddar upp…" : "↑ Ladda upp"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="w-px bg-gray-200 h-6" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Märkning</span>
          <Input
            value={labelInput}
            onChange={e => handleLabelChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); tabToNext(); } }}
            disabled={!selected}
            placeholder="t.ex. 57"
            className="h-7 text-xs w-20"
          />
        </div>

        <div className="w-px bg-gray-200 h-6" />

        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => splitSelected("v")} disabled={!selected}>✂ Dela V</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => splitSelected("h")} disabled={!selected}>✂ Dela H</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={deleteSelected} disabled={!selected}>✕ Ta bort</Button>

        <div className="w-px bg-gray-200 h-6" />

        {/* Legend */}
        <div className="flex gap-3 text-xs text-gray-500">
          {[
            { color: "rgba(239,68,68,0.65)",  label: "Omärkt" },
            { color: "rgba(234,179,8,0.75)",  label: "OCR-gissning" },
            { color: "rgba(34,197,94,0.70)",  label: "Bekräftad" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>

        <div className="w-px bg-gray-200 h-6" />

        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={confirmAllOcr}>✓ Bekräfta OCR</Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setImportOpen(true)}>↑ Importera JSON</Button>

        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
        >
          {saveStatus === "saving" ? "Sparar…"
            : saveStatus === "saved" ? "✓ Sparat!"
            : saveStatus === "error" ? "Fel — försök igen"
            : "Spara"}
        </Button>

        <span className="text-xs text-gray-400 ml-auto">
          {confirmed} bekräftade · {ocrGuesses} OCR · {spots.length} totalt
        </span>
      </div>

      {/* ── Map canvas ── */}
      <div className="p-4 bg-gray-50">
        <div
          ref={containerRef}
          className="relative w-full select-none overflow-visible rounded-lg border border-gray-200 cursor-crosshair"
          style={{ paddingBottom: `${aspectRatio}%` }}
          onMouseDown={e => {
            if ((e.target as HTMLElement).closest("[data-is-spot]")) return;
            selectSpot(null);
            if (!containerRef.current) return;
            drawingRef.current = { start: computePct(e, containerRef.current) };
          }}
        >
          {/* Background */}
          <div className="absolute inset-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                onLoad={e => {
                  const img = e.currentTarget;
                  if (img.naturalWidth > 0)
                    setAspectRatio(img.naturalHeight / img.naturalWidth * 100);
                }}
                className="w-full h-full object-fill"
                draggable={false}
                alt=""
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Ange en bild-URL i verktygsfältet ovan
              </div>
            )}
          </div>

          {/* Spots */}
          {spots.map(sp => {
            const isSel = selected === sp.id;
            return (
              <div
                key={sp.id}
                data-id={sp.id}
                data-is-spot="1"
                style={{
                  position: "absolute",
                  left: `${sp.x}%`, top: `${sp.y}%`,
                  width: `${sp.width}%`, height: `${sp.height}%`,
                  backgroundColor: spotBg(sp),
                  opacity: isSel ? 1 : 0.78,
                  border: isSel ? "2px solid #1e293b" : "1.5px solid rgba(255,255,255,0.6)",
                  boxShadow: isSel ? "0 0 0 2px #fff, 0 0 0 4px #1e293b" : undefined,
                  borderRadius: 2,
                  cursor: isSel ? "move" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(6px, 0.85vw, 11px)", fontWeight: 700,
                  color: "#fff", textShadow: "0 0 4px rgba(0,0,0,0.7)",
                  lineHeight: 1, zIndex: isSel ? 10 : 1,
                  boxSizing: "border-box",
                }}
                title={sp.label ? (sp.ocr ? `OCR: ${sp.label}` : `Plats ${sp.label}`) : `Omärkt #${sp.id}`}
                onMouseDown={e => {
                  e.stopPropagation();
                  if (selectedRef.current !== sp.id) { selectSpot(sp.id); return; }
                  // Already selected — start move
                  if (!containerRef.current) return;
                  movingRef.current = { spId: sp.id, start: computePct(e, containerRef.current), orig: { ...sp }, moved: false };
                }}
              >
                <span style={{ pointerEvents: "none", userSelect: "none" }}>
                  {sp.label || "?"}
                </span>

                {/* Resize handles (selected spot only) */}
                {isSel && HANDLES.map(dir => (
                  <div
                    key={dir}
                    style={handleStyle(dir)}
                    onMouseDown={e => {
                      e.stopPropagation();
                      if (!containerRef.current) return;
                      resizingRef.current = { spId: sp.id, dir, start: computePct(e, containerRef.current), orig: { ...sp } };
                    }}
                  />
                ))}
              </div>
            );
          })}

          {/* Draw preview */}
          {drawPreview && (
            <div style={{
              position: "absolute",
              left: `${drawPreview.x}%`, top: `${drawPreview.y}%`,
              width: `${drawPreview.w}%`, height: `${drawPreview.h}%`,
              border: "2px dashed #2563eb", background: "rgba(37,99,235,0.15)",
              borderRadius: 2, pointerEvents: "none",
            }} />
          )}
        </div>
      </div>

      {/* ── Import modal ── */}
      {importOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Importera platser från JSON</h2>
            <p className="text-sm text-gray-500">
              Kör <code className="bg-gray-100 px-1 rounded text-xs">python3 scripts/detect_spots.py bild.png --format json</code> och klistra in resultatet nedan.
            </p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              className="w-full h-40 font-mono text-xs border border-gray-200 rounded-lg p-3 resize-none outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={'[{"x": 35.5, "y": 50.78, "width": 2.24, "height": 10.21, "label": "57"}, ...]'}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setImportOpen(false); setImportText(""); }}>Avbryt</Button>
              <Button onClick={handleImport}>Importera</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
