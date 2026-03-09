#!/usr/bin/env python3
"""
detect_spots.py — Detect parking spot rectangles in a garage floor plan.

Strategy (hybrid):
  Pass 1 — Hole contours (RETR_CCOMP level-1):
    In the inverted binary image (lines = white), spot interiors are BLACK HOLES
    inside the line structures. Works perfectly for isolated spots and tightly-closed cells.

  Pass 2 — Row subdivision:
    Spots that share thin walls (like a long row) merge into one large hole.
    For any detected region whose aspect ratio indicates it spans multiple spots,
    we crop the image to that region and use HoughLinesP to find the internal
    vertical (or horizontal) dividers, then split accordingly.

  The two results are merged and deduplicated.

Usage:
    python3 scripts/detect_spots.py <image_path> [options]
    python3 scripts/detect_spots.py public/garage-mock.png --debug

Options:
    --min-area N    minimum spot area in px² (default 800)
    --max-area N    maximum spot area in px² (default 20000)
    --debug         write a debug image with detected boxes
    --format json|ts


The recommended workflow:
  1. Run with --format html to generate an interactive editor
  2. Open the HTML in a browser — review, label, delete, split boxes
  3. Click "Exportera" to get a TypeScript snippet
  4. Paste into page.tsx

Usage:
    python3 scripts/detect_spots.py <image_path> [options]
    python3 scripts/detect_spots.py public/garage-mock.png --format html
    python3 scripts/detect_spots.py public/garage-mock.png --debug   # debug PNG only

Options:
    --min-area N    minimum spot area in px² (default 800)
    --max-area N    maximum spot area in px² (default 20000)
    --debug         write a debug image with detected boxes
    --format json|ts|html  (default html)
    --out PATH      output file path (default: <image>_editor.html or stdout for json/ts)
"""

import sys
import json
import base64
import argparse
import cv2
import numpy as np

try:
    import easyocr
    EASYOCR_OK = True
except ImportError:
    EASYOCR_OK = False

DEFAULT_MIN_AREA   = 800
DEFAULT_MAX_AREA   = 20000
DEFAULT_MIN_ASPECT = 0.2
DEFAULT_MAX_ASPECT = 6.0
# Aspect ratio above which a detected region is treated as a "row" to subdivide
ROW_ASPECT_THRESHOLD = 2.8
DEDUP_THRESHOLD = 8  # px


# ── Main entry ────────────────────────────────────────────────────────────────

def detect(image_path: str, min_area: int, max_area: int, debug: bool) -> list[dict]:
    # Read with alpha so RGBA PNGs load correctly; drop alpha for processing
    img_raw = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img_raw is None:
        sys.exit(f"Could not read image: {image_path}")

    if img_raw.ndim == 2:
        img = cv2.cvtColor(img_raw, cv2.COLOR_GRAY2BGR)
    elif img_raw.shape[2] == 4:
        img = cv2.cvtColor(img_raw, cv2.COLOR_BGRA2BGR)
    else:
        img = img_raw

    h, w = img.shape[:2]
    print(f"Image: {w}×{h}px", file=sys.stderr)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Invert: lines → white, interiors → black
    _, inv = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((2, 2), np.uint8)
    dilated = cv2.dilate(inv, kernel, iterations=1)

    # ── Pass 1: hole contours ─────────────────────────────────────────────────
    spots_pass1, large_regions = _hole_contours(dilated, min_area, max_area, w, h)

    # ── Pass 2: subdivide merged rows ─────────────────────────────────────────
    spots_pass2 = []
    for region in large_regions:
        subs = _subdivide_region(gray, region, min_area, w, h)
        spots_pass2.extend(subs)

    all_spots = spots_pass1 + spots_pass2
    all_spots = _deduplicate(all_spots, DEDUP_THRESHOLD)
    all_spots.sort(key=lambda s: (round(s["y"]), s["x"]))

    if debug:
        _write_debug(img, all_spots, image_path)

    # OCR: run EasyOCR once on the full image, then match text positions to spots
    if EASYOCR_OK:
        print("Loading EasyOCR model…", file=sys.stderr)
        reader = easyocr.Reader(["en"], verbose=False)
        print("Running OCR on full image…", file=sys.stderr)
        text_detections = _ocr_full_image(img, reader)
        print(f"  → {len(text_detections)} valid number(s) found in image.", file=sys.stderr)
        ocr_count = _match_labels(all_spots, text_detections)
        print(f"  → {ocr_count} / {len(all_spots)} spots pre-labelled.", file=sys.stderr)
    else:
        print("easyocr not installed — skipping OCR pre-labelling.", file=sys.stderr)

    return all_spots


# ── Pass 1 ────────────────────────────────────────────────────────────────────

def _hole_contours(dilated, min_area, max_area, w, h):
    """Return (normal_spots, large_regions_to_subdivide)."""
    contours, hierarchy = cv2.findContours(dilated, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

    spots = []
    large = []

    if hierarchy is None:
        return spots, large

    for i, cnt in enumerate(contours):
        parent = hierarchy[0][i][3]
        if parent < 0:
            continue  # skip level-0 line blobs

        area = cv2.contourArea(cnt)
        if area < min_area:
            continue

        bx, by, bw, bh = cv2.boundingRect(cnt)
        aspect = bw / bh if bh > 0 else 0

        if not (DEFAULT_MIN_ASPECT <= aspect <= DEFAULT_MAX_ASPECT):
            continue

        fill = area / (bw * bh)
        if fill < 0.55:
            continue

        # Send to pass 2 if: too large, too wide/tall, or suspiciously large for
        # a single spot (catches merged pairs like 53+54 that have normal aspect ratio
        # but area ~2× a typical spot)
        is_oversized = area > max_area * 0.30  # e.g. >6000px² with default max_area
        if area > max_area or aspect > ROW_ASPECT_THRESHOLD or is_oversized:
            large.append({"_px": {"x": bx, "y": by, "w": bw, "h": bh}})
            continue

        spots.append(_make_spot(bx, by, bw, bh, w, h))

    return spots, large


# ── Pass 2: row subdivision ────────────────────────────────────────────────────

def _subdivide_region(gray, region, min_area, img_w, img_h):
    """
    2D projection profile subdivision:
      1. Horizontal projection → find horizontal line positions → divide into bands
      2. For each band, vertical projection → find vertical dividers → individual spots
    This correctly handles merged rows where thin shared walls prevent hole detection.
    """
    px = region["_px"]
    bx, by, bw, bh = px["x"], px["y"], px["w"], px["h"]

    margin = 4
    x0, y0 = max(0, bx - margin), max(0, by - margin)
    x1, y1 = min(img_w, bx + bw + margin), min(img_h, by + bh + margin)

    crop = gray[y0:y1, x0:x1]
    _, inv = cv2.threshold(crop, 200, 255, cv2.THRESH_BINARY_INV)

    # ── Step 1: find horizontal dividers → bands ──────────────────────────────
    # Use a HIGH threshold for horizontal lines in wide regions: the real top/bottom
    # walls of a row span nearly 100% of the width, while faint interior marks
    # (center-line labels etc.) span 50–80% and should be ignored.
    h_min_frac = 0.55 if bw > bh else 0.20
    row_sums = inv.sum(axis=1).astype(np.float32)
    h_peaks = _profile_peaks(row_sums, signal_len=bw, margin=margin, min_frac=h_min_frac)
    h_coords = _to_region_coords(h_peaks, margin, bh)

    spots = []
    for i in range(len(h_coords) - 1):
        band_y_local = h_coords[i]
        band_h = h_coords[i + 1] - h_coords[i]

        if band_h < 12:
            continue

        # ── Step 2: vertical dividers within this band ─────────────────────
        band = inv[band_y_local + margin: band_y_local + margin + band_h, :]
        col_sums = band.sum(axis=0).astype(np.float32)
        v_peaks = _profile_peaks(col_sums, signal_len=band_h, margin=margin, min_frac=0.20)
        v_coords = _to_region_coords(v_peaks, margin, bw)

        for j in range(len(v_coords) - 1):
            spot_w = v_coords[j + 1] - v_coords[j]
            if spot_w * band_h < min_area:
                continue
            spots.append(_make_spot(
                bx + v_coords[j],
                by + band_y_local,
                spot_w,
                band_h,
                img_w, img_h,
            ))

    return spots if len(spots) > 1 else []


def _to_region_coords(peaks: list[int], margin: int, size: int) -> list[int]:
    """Convert crop-space peak positions to region-relative coords, add 0 and size boundaries."""
    coords = sorted(set(p - margin for p in peaks if margin < p < size + margin))
    # Remove coords very close to 0 or size (those are the border lines themselves)
    coords = [c for c in coords if 3 < c < size - 3]
    return [0] + coords + [size]


def _profile_peaks(sums: np.ndarray, signal_len: int, margin: int, min_frac: float = 0.20) -> list[int]:
    """
    Find indices in a projection profile that represent line/wall positions.
    A position is a line if its summed dark-pixel count exceeds min_frac × signal_len × 255.
    Returns the center of each contiguous "above-threshold" run.
    """
    threshold = max(signal_len * 255 * min_frac, 1.0)
    above = sums > threshold
    peaks, in_run, run_start = [], False, 0
    for i, v in enumerate(above):
        if v and not in_run:
            in_run, run_start = True, i
        elif not v and in_run:
            in_run = False
            peaks.append((run_start + i) // 2)
    if in_run:
        peaks.append((run_start + len(above)) // 2)
    return peaks


# ── OCR ───────────────────────────────────────────────────────────────────────

def _valid_label(text: str) -> str:
    """Return cleaned label if it looks like a valid spot number, else empty string."""
    cleaned = "".join(c for c in text if c.isalnum()).upper()
    if not cleaned:
        return ""
    if cleaned.isdigit() and 1 <= int(cleaned) <= 999:
        return cleaned
    if cleaned.startswith("MC") and cleaned[2:].isdigit():
        return cleaned
    return ""


def _ocr_full_image(img: np.ndarray, reader) -> list[dict]:
    """
    Run EasyOCR on the full floor plan image (upscaled 2×) to detect all
    printed numbers. Returns a list of {label, cx, cy, conf} in original
    image pixel coordinates.
    """
    h, w = img.shape[:2]
    scale = 2  # upscale for better accuracy on small text
    big = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    try:
        results = reader.readtext(
            big,
            allowlist="0123456789MCmc",
            detail=1,
            paragraph=False,
            contrast_ths=0.1,
            adjust_contrast=0.5,
            text_threshold=0.5,
            low_text=0.3,
        )
    except Exception as e:
        print(f"EasyOCR error: {e}", file=sys.stderr)
        return []

    detections = []
    seen_labels = {}  # label → best conf so far, to deduplicate nearby reads

    for (bbox, text, conf) in results:
        if conf < 0.25:
            continue
        label = _valid_label(text)
        if not label:
            continue

        # bbox = [[x1,y1],[x2,y1],[x2,y2],[x1,y2]] in upscaled coords
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        cx = sum(xs) / len(xs) / scale
        cy = sum(ys) / len(ys) / scale

        # Keep only the highest-confidence detection for each label
        if label not in seen_labels or conf > seen_labels[label]["conf"]:
            seen_labels[label] = {"label": label, "cx": cx, "cy": cy, "conf": conf}

    return list(seen_labels.values())


def _match_labels(spots: list[dict], detections: list[dict]) -> int:
    """
    For each detected text position, find the spot rectangle that contains it
    and assign the label. Returns the count of spots that got a label.
    """
    count = 0
    for det in detections:
        cx, cy = det["cx"], det["cy"]
        for spot in spots:
            px = spot["_px"]
            if (px["x"] <= cx <= px["x"] + px["w"] and
                    px["y"] <= cy <= px["y"] + px["h"]):
                # If the spot already has a label, keep the higher-confidence one
                if not spot.get("label") or det["conf"] > spot.get("_conf", 0):
                    spot["label"] = det["label"]
                    spot["ocr"] = True
                    spot["_conf"] = det["conf"]
                    count += 1
                break
    return count


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_spot(bx, by, bw, bh, img_w, img_h) -> dict:
    return {
        "_px": {"x": bx, "y": by, "w": bw, "h": bh},
        "x":      round(bx / img_w * 100, 2),
        "y":      round(by / img_h * 100, 2),
        "width":  round(bw / img_w * 100, 2),
        "height": round(bh / img_h * 100, 2),
    }


def _deduplicate(spots: list[dict], threshold: int) -> list[dict]:
    keep, used = [], set()
    for i, s in enumerate(spots):
        if i in used:
            continue
        keep.append(s)
        sx, sy = s["_px"]["x"], s["_px"]["y"]
        for j in range(i + 1, len(spots)):
            if j in used:
                continue
            tx, ty = spots[j]["_px"]["x"], spots[j]["_px"]["y"]
            if abs(sx - tx) <= threshold and abs(sy - ty) <= threshold:
                used.add(j)
    return keep


def _write_debug(img, spots: list[dict], source_path: str):
    out = img.copy()
    for i, s in enumerate(spots):
        px = s["_px"]
        cv2.rectangle(out,
                      (px["x"], px["y"]),
                      (px["x"] + px["w"], px["y"] + px["h"]),
                      (0, 200, 0), 2)
        cv2.putText(out, str(i + 1),
                    (px["x"] + 2, px["y"] + 14),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 220), 1)
    path = source_path.rsplit(".", 1)[0] + "_detected.png"
    cv2.imwrite(path, out)
    print(f"Debug image → {path}", file=sys.stderr)


# ── Output formatting ─────────────────────────────────────────────────────────

def _to_typescript(spots: list[dict]) -> str:
    lines = [
        "// Auto-detected spots — fill in id, label, and status.",
        "// Coordinates are percentages of the floor plan image dimensions.",
        "const DETECTED_SPOTS: Spot[] = [",
    ]
    for i, s in enumerate(spots):
        px = s["_px"]
        lines.append(
            f'  sp("{i+1:02d}", "?", "free",'
            f' {px["x"]}, {px["y"]}, {px["w"]}, {px["h"]}),  // #{i+1:02d}'
        )
    lines.append("];")
    return "\n".join(lines)


# ── HTML interactive editor ───────────────────────────────────────────────────

def _to_html(spots: list[dict], image_path: str) -> str:
    """Generate a self-contained HTML editor for reviewing and labelling spots."""
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    ext = image_path.rsplit(".", 1)[-1].lower()
    mime = "image/png" if ext == "png" else "image/jpeg"

    spots_json = json.dumps(
        [{"id": str(i + 1), "label": s.get("label", ""), "ocr": s.get("ocr", False),
          "x": s["x"], "y": s["y"], "width": s["width"], "height": s["height"]}
         for i, s in enumerate(spots)],
        indent=2,
    )

    return f"""<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8">
<title>Garageplatser — granska & märk</title>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: system-ui, sans-serif; background: #f1f5f9; color: #1e293b; }}

  #toolbar {{
    position: sticky; top: 0; z-index: 100;
    background: #fff; border-bottom: 1px solid #e2e8f0;
    padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  }}
  #toolbar input {{
    border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px;
    font-size: 13px; width: 90px;
  }}
  #toolbar button {{
    border: 1px solid #cbd5e1; background: #fff; border-radius: 6px;
    padding: 4px 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
  }}
  #toolbar button:hover {{ background: #f8fafc; }}
  #toolbar button.danger {{ border-color: #fca5a5; color: #dc2626; }}
  #toolbar button.danger:hover {{ background: #fef2f2; }}
  #toolbar button.primary {{ background: #2563eb; color: #fff; border-color: #2563eb; }}
  #toolbar button.primary:hover {{ background: #1d4ed8; }}
  #toolbar .sep {{ width: 1px; background: #e2e8f0; height: 24px; }}
  #toolbar .hint {{ font-size: 11px; color: #94a3b8; }}
  #count {{ font-size: 12px; color: #64748b; margin-left: auto; }}

  #map-wrap {{
    padding: 16px; display: flex; justify-content: center;
  }}
  #map-container {{
    position: relative; display: inline-block; cursor: crosshair;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12); border-radius: 6px; overflow: hidden;
    user-select: none;
  }}
  #floor-plan {{ display: block; width: 100%; max-width: 1300px; }}
  .spot {{
    position: absolute; border: 1.5px solid rgba(255,255,255,0.6);
    border-radius: 2px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: opacity .1s;
    background: rgba(239,68,68,0.55);  /* default: unverified = red-ish */
    font-size: clamp(6px, 0.85vw, 11px); font-weight: 700;
    color: #fff; text-shadow: 0 0 4px rgba(0,0,0,0.7);
    line-height: 1;
  }}
  .spot.selected {{
    border: 2px solid #1e293b !important;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1e293b;
    opacity: 1 !important; z-index: 10;
    cursor: move;
  }}
  .rh {{
    position: absolute; width: 8px; height: 8px; z-index: 20;
    background: #fff; border: 1.5px solid #1e293b; border-radius: 2px;
    pointer-events: all;
  }}
  .rh-nw {{ top:-4px; left:-4px;  cursor:nw-resize; }}
  .rh-n  {{ top:-4px; left:calc(50% - 4px); cursor:n-resize; }}
  .rh-ne {{ top:-4px; right:-4px; cursor:ne-resize; }}
  .rh-w  {{ top:calc(50% - 4px); left:-4px;  cursor:w-resize; }}
  .rh-e  {{ top:calc(50% - 4px); right:-4px; cursor:e-resize; }}
  .rh-sw {{ bottom:-4px; left:-4px;  cursor:sw-resize; }}
  .rh-s  {{ bottom:-4px; left:calc(50% - 4px); cursor:s-resize; }}
  .rh-se {{ bottom:-4px; right:-4px; cursor:se-resize; }}
  .spot.labelled {{ background: rgba(34,197,94,0.65); }}  /* green = confirmed */
  .spot.labelled.selected {{ background: rgba(34,197,94,0.9); }}
  .spot.ocr {{ background: rgba(234,179,8,0.70); }}      /* amber = OCR guess */
  .spot.ocr.selected {{ background: rgba(234,179,8,0.95); }}

  #drag-preview {{
    position: absolute; border: 2px dashed #2563eb; background: rgba(37,99,235,0.15);
    pointer-events: none; display: none;
  }}

  #output-wrap {{
    padding: 0 16px 32px;
  }}
  #output-wrap h2 {{ font-size: 14px; font-weight: 600; margin-bottom: 8px; }}
  #output {{ width: 100%; height: 280px; font-family: monospace; font-size: 12px;
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;
    background: #f8fafc; resize: vertical;
  }}

  .legend {{ display: flex; gap: 12px; font-size: 12px; color: #475569; }}
  .legend span {{ display: flex; align-items: center; gap: 4px; }}
  .legend i {{ display: inline-block; width: 12px; height: 12px; border-radius: 2px; }}
</style>
</head>
<body>

<div id="toolbar">
  <strong style="font-size:13px">Garageplatser</strong>
  <div class="sep"></div>

  <label style="font-size:12px;display:flex;gap:4px;align-items:center">
    Märkning:
    <input id="label-input" type="text" placeholder="t.ex. 57" disabled
           oninput="onLabelInput(this.value)" onkeydown="onLabelKeydown(event)">
  </label>

  <div class="sep"></div>

  <button onclick="splitSelected('v')" title="Dela vald plats i hälften (vänster/höger)">
    ✂ Dela vertikalt (V)
  </button>
  <button onclick="splitSelected('h')" title="Dela vald plats i hälften (topp/botten)">
    ✂ Dela horisontellt (H)
  </button>
  <button class="danger" onclick="deleteSelected()" title="Ta bort vald plats (Del)">
    ✕ Ta bort (Del)
  </button>

  <div class="sep"></div>

  <div class="legend">
    <span><i style="background:rgba(239,68,68,0.65)"></i> Omärkt</span>
    <span><i style="background:rgba(234,179,8,0.70)"></i> OCR-gissning</span>
    <span><i style="background:rgba(34,197,94,0.65)"></i> Bekräftad</span>
  </div>

  <div class="sep"></div>

  <button onclick="confirmAllOcr()" title="Bekräfta alla OCR-gissningar utan att ändra dem">
    ✓ Bekräfta alla OCR
  </button>
  <button class="primary" onclick="exportTS()">Exportera TypeScript →</button>

  <span id="count"></span>
</div>

<div id="map-wrap">
  <div id="map-container">
    <img id="floor-plan" src="data:{mime};base64,{img_b64}" draggable="false"
         onload="initMap()" />
    <div id="drag-preview"></div>
  </div>
</div>

<div id="output-wrap" style="display:none">
  <h2>TypeScript — kopiera till page.tsx</h2>
  <textarea id="output" readonly></textarea>
</div>

<script>
let spots = {spots_json};
let selected = null;
let nextId = spots.length + 1;
let dragging = false, dragStart = null;
let resizing = null;  // {{ spId, dir, startPct, startSpot }}
let moving = null;    // {{ spId, startPct, startSpot, moved }}

// ── Render ────────────────────────────────────────────────────────────────────

function initMap() {{
  render();
  document.getElementById('map-container').addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('keydown', onKeyDown);
}}

function render() {{
  const container = document.getElementById('map-container');
  // Remove existing spot divs
  container.querySelectorAll('.spot').forEach(e => e.remove());
  spots.forEach(sp => {{
    const el = document.createElement('div');
    let cls = 'spot';
    if (sp.label) cls += sp.ocr ? ' ocr' : ' labelled';
    if (selected === sp.id) cls += ' selected';
    el.className = cls;
    el.style.left    = sp.x + '%';
    el.style.top     = sp.y + '%';
    el.style.width   = sp.width + '%';
    el.style.height  = sp.height + '%';
    el.textContent   = sp.label || '?';
    el.title = sp.label
      ? (sp.ocr ? `OCR-gissning: ${{sp.label}} — klicka för att bekräfta` : `Plats ${{sp.label}}`)
      : `Omärkt #${{sp.id}}`;
    el.dataset.id = sp.id;
    el.addEventListener('mousedown', e => {{
      e.stopPropagation();
      if (selected !== sp.id) {{ selectSpot(sp.id); return; }}
      // Already selected — start move
      moving = {{ spId: sp.id, startPct: pct(e), startSpot: {{...sp}}, moved: false }};
    }});
    // Resize handles (only on selected spot)
    if (selected === sp.id) {{
      ['nw','n','ne','w','e','sw','s','se'].forEach(dir => {{
        const h = document.createElement('div');
        h.className = `rh rh-${{dir}}`;
        h.addEventListener('mousedown', e => {{
          e.stopPropagation();
          resizing = {{ spId: sp.id, dir, startPct: pct(e), startSpot: {{...sp}} }};
        }});
        el.appendChild(h);
      }});
    }}
    container.appendChild(el);
  }});
  updateCount();
}}

function selectSpot(id) {{
  selected = (selected === id) ? null : id;
  const sp = spots.find(s => s.id === id);
  const input = document.getElementById('label-input');
  if (sp) {{
    input.disabled = false;
    input.value = sp.label || '';
    input.focus();
  }} else {{
    input.disabled = true;
    input.value = '';
  }}
  render();
}}

function updateCount() {{
  const confirmed = spots.filter(s => s.label && !s.ocr).length;
  const ocr = spots.filter(s => s.label && s.ocr).length;
  document.getElementById('count').textContent =
    `${{confirmed}} bekräftade · ${{ocr}} OCR-gissningar · ${{spots.length}} totalt`;
}}

// ── Label input ───────────────────────────────────────────────────────────────

function onLabelInput(val) {{
  if (!selected) return;
  const sp = spots.find(s => s.id === selected);
  if (sp) {{ sp.label = val.trim(); sp.ocr = false; }}
  render();
  // Re-focus input after render
  const input = document.getElementById('label-input');
  input.focus();
  input.setSelectionRange(val.length, val.length);
}}

function onLabelKeydown(e) {{
  if (e.key === 'Enter' || e.key === 'Tab') {{
    e.preventDefault();
    // Move to next unlabelled or OCR-guessed spot (needs review)
    const needsReview = s => !s.label || s.ocr;
    const idx = spots.findIndex(s => s.id === selected);
    const next = spots.slice(idx + 1).find(needsReview)
               || spots.find(needsReview);
    if (next) selectSpot(next.id);
  }}
}}

// ── Actions ───────────────────────────────────────────────────────────────────

function confirmAllOcr() {{
  spots.forEach(s => {{ if (s.ocr) s.ocr = false; }});
  render();
}}

function deleteSelected() {{
  if (!selected) return;
  spots = spots.filter(s => s.id !== selected);
  selected = null;
  document.getElementById('label-input').disabled = true;
  document.getElementById('label-input').value = '';
  render();
}}

function splitSelected(axis) {{
  if (!selected) return;
  const idx = spots.findIndex(s => s.id === selected);
  if (idx === -1) return;
  const sp = spots[idx];
  let a, b;
  if (axis === 'v') {{
    const half = sp.width / 2;
    a = {{ ...sp, id: sp.id, width: half }};
    b = {{ ...sp, id: String(nextId++), label: '', x: sp.x + half, width: half }};
  }} else {{
    const half = sp.height / 2;
    a = {{ ...sp, id: sp.id, height: half }};
    b = {{ ...sp, id: String(nextId++), label: '', y: sp.y + half, height: half }};
  }}
  spots.splice(idx, 1, a, b);
  selected = b.id;
  render();
  document.getElementById('label-input').value = '';
  document.getElementById('label-input').disabled = false;
  document.getElementById('label-input').focus();
}}

// ── Draw new box ──────────────────────────────────────────────────────────────

function onMouseDown(e) {{
  if (e.target.classList.contains('spot') || e.target.classList.contains('rh')) return;
  // Deselect and start drawing a new box
  selected = null;
  document.getElementById('label-input').disabled = true;
  document.getElementById('label-input').value = '';
  dragging = true;
  dragStart = pct(e);
  const preview = document.getElementById('drag-preview');
  preview.style.display = 'block';
  preview.style.left = dragStart.x + '%';
  preview.style.top  = dragStart.y + '%';
  preview.style.width = '0';
  preview.style.height = '0';
  render();
}}

function onMouseMove(e) {{
  // ── Resize ──────────────────────────────────────────────────────────────────
  if (resizing) {{
    const cur = pct(e);
    const dx = cur.x - resizing.startPct.x;
    const dy = cur.y - resizing.startPct.y;
    const o = resizing.startSpot;
    const d = resizing.dir;
    let nx = o.x, ny = o.y, nw = o.width, nh = o.height;
    if (d.includes('w')) {{ nx = o.x + dx; nw = o.width - dx; }}
    if (d.includes('e')) {{ nw = o.width + dx; }}
    if (d.includes('n')) {{ ny = o.y + dy; nh = o.height - dy; }}
    if (d.includes('s')) {{ nh = o.height + dy; }}
    // Clamp to minimum size
    if (nw < 0.5) {{ nw = 0.5; if (d.includes('w')) nx = o.x + o.width - 0.5; }}
    if (nh < 0.5) {{ nh = 0.5; if (d.includes('n')) ny = o.y + o.height - 0.5; }}
    const sp = spots.find(s => s.id === resizing.spId);
    sp.x = round(nx); sp.y = round(ny); sp.width = round(nw); sp.height = round(nh);
    // Update DOM directly for smooth resize (no full re-render)
    const el = document.querySelector(`.spot[data-id="${{resizing.spId}}"]`);
    if (el) {{
      el.style.left = sp.x + '%'; el.style.top  = sp.y + '%';
      el.style.width = sp.width + '%'; el.style.height = sp.height + '%';
    }}
    return;
  }}
  // ── Move ────────────────────────────────────────────────────────────────────
  if (moving) {{
    const cur = pct(e);
    const dx = cur.x - moving.startPct.x;
    const dy = cur.y - moving.startPct.y;
    if (!moving.moved && Math.abs(dx) < 0.15 && Math.abs(dy) < 0.15) return;
    moving.moved = true;
    const sp = spots.find(s => s.id === moving.spId);
    sp.x = round(moving.startSpot.x + dx);
    sp.y = round(moving.startSpot.y + dy);
    const el = document.querySelector(`.spot[data-id="${{moving.spId}}"]`);
    if (el) {{ el.style.left = sp.x + '%'; el.style.top = sp.y + '%'; }}
    return;
  }}
  // ── Draw new box ─────────────────────────────────────────────────────────────
  if (!dragging) return;
  const cur = pct(e);
  const preview = document.getElementById('drag-preview');
  preview.style.left   = Math.min(dragStart.x, cur.x) + '%';
  preview.style.top    = Math.min(dragStart.y, cur.y) + '%';
  preview.style.width  = Math.abs(cur.x - dragStart.x) + '%';
  preview.style.height = Math.abs(cur.y - dragStart.y) + '%';
}}

function onMouseUp(e) {{
  if (resizing) {{ resizing = null; render(); return; }}
  if (moving)   {{ moving = null;   render(); return; }}
  if (!dragging) return;
  dragging = false;
  document.getElementById('drag-preview').style.display = 'none';
  const cur = pct(e);
  const x = round(Math.min(dragStart.x, cur.x));
  const y = round(Math.min(dragStart.y, cur.y));
  const w = round(Math.abs(cur.x - dragStart.x));
  const h = round(Math.abs(cur.y - dragStart.y));
  if (w < 0.3 || h < 0.3) {{ render(); return; }}  // too small = accidental click
  const id = String(nextId++);
  spots.push({{ id, label: '', x, y, width: w, height: h }});
  selectSpot(id);
}}

function pct(e) {{
  const rect = document.getElementById('map-container').getBoundingClientRect();
  return {{
    x: (e.clientX - rect.left) / rect.width  * 100,
    y: (e.clientY - rect.top)  / rect.height * 100,
  }};
}}

function round(n) {{ return Math.round(n * 100) / 100; }}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

function onKeyDown(e) {{
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {{
    e.preventDefault(); deleteSelected();
  }} else if (e.key === 'v' || e.key === 'V') {{
    splitSelected('v');
  }} else if (e.key === 'h' || e.key === 'H') {{
    splitSelected('h');
  }}
}}

// ── Export ────────────────────────────────────────────────────────────────────

function exportTS() {{
  const lines = [
    '// Paste into your MOCK_SPOTS array in page.tsx',
    'const SPOTS: Spot[] = [',
  ];
  spots.forEach(sp => {{
    const label = sp.label || '?';
    lines.push(
      `  s("${{label}}", "${{label}}", "free",` +
      ` ${{sp.x.toFixed(2)}}, ${{sp.y.toFixed(2)}},` +
      ` ${{sp.width.toFixed(2)}}, ${{sp.height.toFixed(2)}}),`
    );
  }});
  lines.push('];');
  const out = lines.join('\\n');
  document.getElementById('output').value = out;
  document.getElementById('output-wrap').style.display = 'block';
  document.getElementById('output-wrap').scrollIntoView({{ behavior: 'smooth' }});
  document.getElementById('output').select();
  try {{ document.execCommand('copy'); }} catch(e) {{}}
}}
</script>
</body>
</html>"""


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser()
    p.add_argument("image")
    p.add_argument("--min-area", type=int, default=DEFAULT_MIN_AREA)
    p.add_argument("--max-area", type=int, default=DEFAULT_MAX_AREA)
    p.add_argument("--debug", action="store_true")
    p.add_argument("--format", choices=["json", "ts", "html"], default="html")
    p.add_argument("--out", default=None, help="Output file path (for html format)")
    args = p.parse_args()

    spots = detect(args.image, args.min_area, args.max_area, args.debug)
    print(f"Detected {len(spots)} spots.", file=sys.stderr)
    clean = [{k: v for k, v in s.items() if k != "_px"} for s in spots]

    if args.format == "json":
        print(json.dumps(clean, indent=2))
    elif args.format == "ts":
        print(_to_typescript(spots))
    else:
        html = _to_html(spots, args.image)
        out_path = args.out or args.image.rsplit(".", 1)[0] + "_editor.html"
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Editor written to: {out_path}", file=sys.stderr)
        print(f"Open in browser:   open {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
