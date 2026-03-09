#!/usr/bin/env npx tsx
/**
 * End-to-end map processing pipeline.
 *
 * Usage:
 *   npx tsx scripts/process-map.ts <association-id>
 *
 * What it does:
 *   1. Fetches the floor plan image from Vercel Blob (private, using BLOB_READ_WRITE_TOKEN)
 *   2. Runs detect_spots.py on it to produce spot JSON
 *   3. Upserts all spots into the DB and sets map_status = 'review'
 *
 * Requires in .env.local:
 *   DATABASE_URL, BLOB_READ_WRITE_TOKEN
 */

import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import postgres from "postgres";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k?.trim() && rest.length) process.env[k.trim()] = rest.join("=").trim();
  }
}

const [, , assocId] = process.argv;
if (!assocId) {
  console.error("Usage: npx tsx scripts/process-map.ts <association-id>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN not set.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

type SpotInput = { label?: string; x: number; y: number; width: number; height: number; type?: string };

async function main() {
  // 1. Look up association + image URL
  const [assoc] = await sql<{ name: string; map_image_url: string | null; map_status: string }[]>`
    SELECT name, map_image_url, map_status FROM associations WHERE id = ${assocId}
  `;
  if (!assoc) { console.error(`Association not found: ${assocId}`); process.exit(1); }
  if (!assoc.map_image_url) { console.error("No map_image_url set for this association."); process.exit(1); }

  console.log(`Association : ${assoc.name}`);
  console.log(`Status      : ${assoc.map_status}`);
  console.log(`Image URL   : ${assoc.map_image_url}`);

  // 2. Download the image from Vercel Blob (private — needs token)
  console.log("\n→ Downloading image…");
  const imageRes = await fetch(assoc.map_image_url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!imageRes.ok) {
    console.error(`Failed to download image: ${imageRes.status} ${imageRes.statusText}`);
    process.exit(1);
  }

  const ext = assoc.map_image_url.split(".").pop()?.toLowerCase() ?? "png";
  const tmpImage = path.join(os.tmpdir(), `brf-garage-${assocId}.${ext}`);
  fs.writeFileSync(tmpImage, Buffer.from(await imageRes.arrayBuffer()));
  console.log(`   Saved to ${tmpImage}`);

  // 3. Run detect_spots.py
  console.log("\n→ Running detect_spots.py…");
  const scriptDir = path.resolve(process.cwd(), "scripts");
  let spotsJson: string;
  try {
    spotsJson = execSync(
      `python3 "${path.join(scriptDir, "detect_spots.py")}" "${tmpImage}" --format json`,
      { stdio: ["pipe", "pipe", "inherit"] }
    ).toString();
  } finally {
    fs.unlinkSync(tmpImage);
  }

  const spots: SpotInput[] = JSON.parse(spotsJson);
  console.log(`   Detected ${spots.length} spots`);

  // 4. Upsert spots into DB
  console.log("\n→ Importing spots…");
  let inserted = 0, skipped = 0;
  for (const spot of spots) {
    if (!spot.label) { skipped++; continue; }
    await sql`
      INSERT INTO spots (association_id, identifier, map_x, map_y, map_width, map_height, map_type)
      VALUES (
        ${assocId},
        ${spot.label},
        ${spot.x},
        ${spot.y},
        ${spot.width},
        ${spot.height},
        ${spot.type ?? "car"}
      )
      ON CONFLICT (association_id, identifier) DO UPDATE SET
        map_x      = EXCLUDED.map_x,
        map_y      = EXCLUDED.map_y,
        map_width  = EXCLUDED.map_width,
        map_height = EXCLUDED.map_height,
        map_type   = EXCLUDED.map_type
    `;
    inserted++;
  }

  // 5. Mark as ready for admin review
  await sql`UPDATE associations SET map_status = 'review' WHERE id = ${assocId}`;

  console.log(`   ${inserted} imported, ${skipped} skipped (no label)`);
  console.log("\n✓ Done — map_status set to 'review'");
  console.log("  The admin can now open the editor and publish the map.");

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
