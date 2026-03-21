"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

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

function spotBgColor(sp: EditorSpot) {
  if (!sp.label) return "rgba(239,68,68,0.60)";
  if (sp.ocr)   return "rgba(234,179,8,0.75)";
  return "rgba(34,197,94,0.70)";
}

function handleStyle(dir: HandleDir): React.CSSProperties {
  const v = dir.includes("n") ? { top: -4 } : dir.includes("s") ? { bottom: -4 } : { top: "calc(50% - 4px)" };
  const h = dir.includes("w") ? { left: -4 } : dir.includes("e") ? { right: -4 } : { left: "calc(50% - 4px)" };
  return {
    position: "absolute", width: 6, height: 6,
    background: "white", border: "1.5px solid #2563eb", borderRadius: 1,
    cursor: `${dir}-resize`, zIndex: 20, ...v, ...h,
  };
}

export default function MapEditor({
  initialSpots,
  initialImageUrl,
  mapStatus,
  unplacedSpots = [],
}: {
  initialSpots: EditorSpot[];
  initialImageUrl: string | null;
  mapStatus: string;
  unplacedSpots?: string[];
}) {
  const router = useRouter();
  const [spots, setSpots] = useState<EditorSpot[]>(initialSpots);
  const [selected, setSelected] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const imageUrl = initialImageUrl ?? "";
  const [aspectRatio, setAspectRatio] = useState(52.69);
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishStatus, setPublishStatus] = useState<"idle" | "saving" | "error">("idle");

  const containerRef = useRef<HTMLDivElement>(null);
  const spotsRef = useRef(spots);
  const selectedRef = useRef<string | null>(null);
  const nextIdRef = useRef(initialSpots.length + 1);
  const resizingRef = useRef<{ spId: string; dir: HandleDir; start: { x: number; y: number }; orig: EditorSpot } | null>(null);
  const movingRef   = useRef<{ spId: string; start: { x: number; y: number }; orig: EditorSpot; moved: boolean } | null>(null);
  const drawingRef  = useRef<{ start: { x: number; y: number } } | null>(null);

  useEffect(() => { spotsRef.current = spots; }, [spots]);

  function selectSpot(id: string | null) {
    selectedRef.current = id;
    setSelected(id);
    const sp = spotsRef.current.find(s => s.id === id);
    setLabelInput(sp?.label ?? "");
  }

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
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedRef.current) {
        e.preventDefault();
        deleteSelected();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function deleteSelected() {
    const id = selectedRef.current;
    if (!id) return;
    spotsRef.current = spotsRef.current.filter(s => s.id !== id);
    setSpots(spotsRef.current);
    selectSpot(null);
  }

  function confirmAllOcr() {
    spotsRef.current = spotsRef.current.map(s => s.ocr ? { ...s, ocr: false } : s);
    setSpots([...spotsRef.current]);
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

  async function handleSave() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/admin/map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

  async function handlePublish() {
    setPublishStatus("saving");
    try {
      const res = await fetch("/api/admin/map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spots: spots.map(s => ({ label: s.label, x: s.x, y: s.y, width: s.width, height: s.height })),
          publish: true,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/dashboard/map");
    } catch {
      setPublishStatus("error");
    }
  }

  const confirmed  = spots.filter(s => s.label && !s.ocr).length;
  const ocrGuesses = spots.filter(s => s.ocr).length;
  const unlabeled  = spots.filter(s => !s.label).length;

  return (
    <div>
      {/* ── TOP TOOLBAR ── */}
      <div className="bg-white px-4 sm:px-6 min-h-14 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 shadow-sm z-30 border-b border-[#c3c6d7]/20">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Märkning input */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-[#434655] tracking-wider leading-none mb-1">
              Märkning
            </label>
            <input
              value={labelInput}
              onChange={e => handleLabelChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Tab" || e.key === "Enter") {
                  e.preventDefault();
                  tabToNext();
                }
              }}
              disabled={!selected}
              placeholder="t.ex. A12"
              className="h-8 w-24 px-2 text-sm border-0 bg-[#f2f4f6] rounded focus:ring-1 focus:ring-[#004ac6] outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!selected}
            className="h-8 w-8 flex items-center justify-center rounded text-red-400 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Ta bort vald plats (Delete)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
          </button>

          <div className="h-6 w-px bg-[#c3c6d7]/30 hidden sm:block" />

          {/* Legend dots — hidden on xs */}
          <div className="hidden sm:flex items-center gap-4 text-[11px] font-semibold text-[#434655]">
            {[
              { color: "#10b981", label: "Bekräftad"    },
              { color: "#f59e0b", label: "OCR-gissning" },
              { color: "#ef4444", label: "Omärkt"       },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Stats — hidden on xs */}
          <p className="hidden sm:block text-[12px] text-[#434655] font-medium">
            {confirmed} bekräftade
            {ocrGuesses > 0 && <> · {ocrGuesses} att granska</>}
            {unlabeled > 0 && <> · {unlabeled} omärkta</>}
          </p>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving" || publishStatus === "saving"}
              className="text-[#004ac6] text-xs font-bold hover:bg-[#004ac6]/5 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Sparar…"
                : saveStatus === "saved" ? "✓ Sparat!"
                : saveStatus === "error" ? "Fel"
                : "Spara"}
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={publishStatus === "saving" || saveStatus === "saving"}
              className="bg-gradient-to-r from-[#004ac6] to-[#2563eb] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
            >
              {publishStatus === "saving"
                ? "Publicerar…"
                : publishStatus === "error"
                ? "Fel — försök igen"
                : mapStatus === "published"
                ? "Uppdatera karta"
                : "Publicera karta"}
            </button>
          </div>
        </div>
      </div>

      {/* ── STATUS BANNER ── */}
      {mapStatus === "review" && (
        <div className="bg-[#004ac6]/10 px-6 py-2.5 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#004ac6] text-sm">info</span>
          <p className="text-xs font-semibold text-[#004ac6]">
            Redo att granska — justera platser vid behov och klicka sedan Publicera karta.
          </p>
        </div>
      )}

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-[#f7f9fb]">

        {/* LEFT: CANVAS */}
        <div className="flex-[3] relative bg-white rounded-xl shadow-sm border border-[#c3c6d7]/10 overflow-visible">
          <div
            ref={containerRef}
            className="relative w-full select-none cursor-crosshair rounded-xl overflow-visible"
            style={{ paddingBottom: `${aspectRatio}%` }}
            onMouseDown={e => {
              if ((e.target as HTMLElement).closest("[data-is-spot]")) return;
              selectSpot(null);
              if (!containerRef.current) return;
              drawingRef.current = { start: computePct(e, containerRef.current) };
            }}
          >
            {/* Floor plan image */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  onLoad={e => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0)
                      setAspectRatio(img.naturalHeight / img.naturalWidth * 100);
                  }}
                  className="w-full h-full object-fill opacity-80"
                  draggable={false}
                  alt=""
                />
              ) : (
                <div className="w-full h-full bg-[#f2f4f6] flex items-center justify-center text-[#737686] text-sm">
                  Ingen planritning uppladdad
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
                    backgroundColor: spotBgColor(sp),
                    opacity: isSel ? 1 : 0.78,
                    border: isSel ? "2px solid #004ac6" : "1.5px solid rgba(255,255,255,0.6)",
                    boxShadow: isSel ? "0 0 0 2px #fff, 0 0 0 4px #004ac6" : undefined,
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
                    if (!containerRef.current) return;
                    movingRef.current = {
                      spId: sp.id,
                      start: computePct(e, containerRef.current),
                      orig: { ...sp },
                      moved: false,
                    };
                  }}
                >
                  <span style={{ pointerEvents: "none", userSelect: "none" }}>
                    {sp.label || "?"}
                  </span>
                  {isSel && HANDLES.map(dir => (
                    <div
                      key={dir}
                      style={handleStyle(dir)}
                      onMouseDown={e => {
                        e.stopPropagation();
                        if (!containerRef.current) return;
                        resizingRef.current = {
                          spId: sp.id, dir,
                          start: computePct(e, containerRef.current),
                          orig: { ...sp },
                        };
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
                border: "2px dashed #004ac6",
                background: "rgba(0,74,198,0.1)",
                borderRadius: 2, pointerEvents: "none",
              }} />
            )}

            {/* Canvas hint */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-[#191c1e]/90 text-white px-4 py-2 rounded-lg text-xs font-medium shadow-lg z-20 backdrop-blur-sm pointer-events-none whitespace-nowrap">
              Rita ny plats: klicka och dra på kartan
            </div>
          </div>
        </div>

        {/* RIGHT: SIDEBAR */}
        <aside className="w-full lg:w-[260px] bg-white rounded-xl shadow-sm border border-[#c3c6d7]/10 p-5 flex flex-col gap-6 self-start">

          {/* Ej placerade */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4
                className="font-extrabold text-sm text-[#191c1e]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Ej placerade platser
              </h4>
              <span className="bg-[#e6e8ea] px-2 py-0.5 rounded text-[10px] font-bold text-[#434655]">
                {unplacedSpots.length}
              </span>
            </div>
            {unplacedSpots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {unplacedSpots.map(identifier => (
                  <button
                    key={identifier}
                    type="button"
                    className="px-3 py-1.5 bg-[#f2f4f6] text-[#004ac6] font-bold text-xs rounded-lg border border-[#004ac6]/10 hover:border-[#004ac6] transition-colors cursor-pointer"
                    onClick={() => {
                      setLabelInput(identifier);
                      const id = selectedRef.current;
                      if (id) {
                        const sp = spotsRef.current.find(s => s.id === id);
                        if (sp) { sp.label = identifier; sp.ocr = false; }
                        setSpots(prev => prev.map(s => s.id === id ? { ...s, label: identifier, ocr: false } : s));
                      }
                    }}
                    title="Välj en plats på kartan och klicka sedan för att sätta märkning"
                  >
                    {identifier}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#737686]">Alla platser är placerade på kartan.</p>
            )}
          </div>

          {/* Platser på kartan */}
          <div className="pt-4 border-t border-[#eceef0]">
            <div className="flex items-center justify-between mb-4">
              <h4
                className="font-extrabold text-sm text-[#191c1e]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Platser på kartan
              </h4>
              <span className="bg-[#004ac6]/10 text-[#004ac6] px-2 py-0.5 rounded text-[10px] font-bold">
                {spots.length}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Bekräftade", count: confirmed,  color: "#10b981" },
                { label: "OCR-gissning", count: ocrGuesses, color: "#f59e0b" },
                { label: "Omärkta",    count: unlabeled,  color: "#ef4444" },
              ].map(({ label, count, color }) => count > 0 && (
                <div key={label} className="flex items-center justify-between text-xs p-2 bg-[#f2f4f6] rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-[#434655]">{label}</span>
                  </div>
                  <span className="font-bold text-[#191c1e]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* OCR confirm */}
          {ocrGuesses > 0 && (
            <div className="mt-auto">
              <button
                type="button"
                onClick={confirmAllOcr}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 py-3 rounded-xl text-xs font-bold transition-all border border-amber-500/20 flex flex-col items-center gap-1"
              >
                <span>Bekräfta OCR-gissningar ({ocrGuesses})</span>
                <span className="text-[9px] font-medium opacity-70">Granska automatiskt tolkade skyltar</span>
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
