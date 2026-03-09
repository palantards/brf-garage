import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

// PUT /api/admin/map — save spot coordinates + optional image URL
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;

  const body = await req.json() as {
    imageUrl?: string | null;
    spots: Array<{
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      type?: string;
    }>;
  };

  const { imageUrl, spots } = body;

  if (!Array.isArray(spots)) {
    return NextResponse.json({ error: "spots must be an array" }, { status: 400 });
  }

  if (imageUrl !== undefined) {
    await sql`
      UPDATE associations SET map_image_url = ${imageUrl} WHERE id = ${assocId}
    `;
  }

  for (const spot of spots) {
    if (!spot.label) continue;
    await sql`
      INSERT INTO spots (association_id, identifier, map_x, map_y, map_width, map_height, map_type)
      VALUES (${assocId}, ${spot.label}, ${spot.x}, ${spot.y}, ${spot.width}, ${spot.height}, ${spot.type ?? "car"})
      ON CONFLICT (association_id, identifier) DO UPDATE SET
        map_x     = EXCLUDED.map_x,
        map_y     = EXCLUDED.map_y,
        map_width = EXCLUDED.map_width,
        map_height= EXCLUDED.map_height,
        map_type  = EXCLUDED.map_type
    `;
  }

  // Mark map as ready once spots have been saved
  if (spots.some(s => s.label)) {
    await sql`
      UPDATE associations SET map_status = 'ready' WHERE id = ${assocId}
    `;
  }

  return NextResponse.json({ ok: true });
}
