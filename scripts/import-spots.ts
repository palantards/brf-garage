#!/usr/bin/env npx tsx
/**
 * Import detected spots from detect_spots.py into the DB.
 *
 * Usage:
 *   npx tsx scripts/import-spots.ts <association-id> <spots.json>
 *
 * Example:
 *   python3 scripts/detect_spots.py floorplan.png --format json > spots.json
 *   npx tsx scripts/import-spots.ts abc-123-uuid spots.json
 *
 * The spots.json file is the raw JSON output from detect_spots.py --format json:
 *   [{ "x": 35.5, "y": 50.78, "width": 2.24, "height": 10.21, "label": "57" }, ...]
 *
 * Spots with no label are skipped. Set map_status = 'ready' when done.
 */

import fs from "fs";
import path from "path";
import postgres from "postgres";

const [,, assocId, jsonPath] = process.argv;

if (!assocId || !jsonPath) {
  console.error("Usage: npx tsx scripts/import-spots.ts <association-id> <spots.json>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  // Try loading .env.local
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Add it to .env.local or export it.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

type SpotInput = {
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type?: string;
};

async function main() {
  const raw = fs.readFileSync(path.resolve(jsonPath), "utf8");
  const spots: SpotInput[] = JSON.parse(raw);

  // Verify the association exists
  const [assoc] = await sql<{ name: string; map_status: string }[]>`
    SELECT name, map_status FROM associations WHERE id = ${assocId}
  `;
  if (!assoc) {
    console.error(`Association not found: ${assocId}`);
    await sql.end();
    process.exit(1);
  }

  console.log(`Association: ${assoc.name} (status: ${assoc.map_status})`);
  console.log(`Importing ${spots.length} spots…`);

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
        map_x     = EXCLUDED.map_x,
        map_y     = EXCLUDED.map_y,
        map_width = EXCLUDED.map_width,
        map_height= EXCLUDED.map_height,
        map_type  = EXCLUDED.map_type
    `;
    inserted++;
  }

  await sql`
    UPDATE associations SET map_status = 'review' WHERE id = ${assocId}
  `;

  console.log(`Done. ${inserted} spots imported, ${skipped} skipped (no label).`);
  console.log(`Map status → review (admin can now open the editor and publish)`);
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
