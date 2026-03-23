import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { createOfferForSpot } from "@/lib/offers";

/**
 * POST /api/spots/resign — Resident gives notice on their own spot.
 * Sets ending_at to 3 months from now and triggers an offer.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const assocId = session.user.associationId;

  // Find active assignment
  const [assignment] = await sql<{ id: string; spot_id: string; ending_at: string | null }[]>`
    SELECT id, spot_id, ending_at FROM spot_assignments
    WHERE user_id = ${userId} AND association_id = ${assocId} AND ended_at IS NULL
  `;

  if (!assignment) {
    return NextResponse.json({ error: "Du har ingen aktiv plats" }, { status: 400 });
  }
  if (assignment.ending_at) {
    return NextResponse.json({ error: "Du har redan sagt upp din plats" }, { status: 409 });
  }

  // Set ending_at to 3 months from now
  await sql`
    UPDATE spot_assignments
    SET ending_at = now() + interval '3 months'
    WHERE id = ${assignment.id}
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${assocId},
      ${userId},
      'spot.resigned',
      ${sql.json({ spot_id: assignment.spot_id })}
    )
  `;

  // Auto-trigger offer to next in queue
  await createOfferForSpot(assignment.spot_id, assocId, userId);

  return NextResponse.json({ ok: true });
}
