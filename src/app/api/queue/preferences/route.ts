import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

// POST /api/queue/preferences — add a preference for a spot
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, associationId } = session.user;

  const body = await req.json() as { spotId?: string };
  if (!body.spotId) {
    return NextResponse.json({ error: "spotId krävs" }, { status: 400 });
  }
  const { spotId } = body;

  // Guard: user must be in active queue
  const [entry] = await sql<{ id: string }[]>`
    SELECT id FROM queue_entries
    WHERE user_id = ${userId} AND association_id = ${associationId} AND left_at IS NULL
  `;
  if (!entry) {
    return NextResponse.json({ error: "Du måste stå i kön för att markera intresse" }, { status: 403 });
  }

  // Guard: spot must belong to this association and be upcoming (active assignment with ending_at set)
  const [spot] = await sql<{ id: string }[]>`
    SELECT s.id FROM spots s
    JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL AND sa.ending_at IS NOT NULL
    WHERE s.id = ${spotId} AND s.association_id = ${associationId} AND s.available = true
  `;
  if (!spot) {
    return NextResponse.json({ error: "Platsen hittades inte eller är inte kommande" }, { status: 404 });
  }

  // ON CONFLICT DO NOTHING makes this idempotent — safe against double-clicks
  await sql`
    INSERT INTO spot_preferences (association_id, user_id, spot_id)
    VALUES (${associationId}, ${userId}, ${spotId})
    ON CONFLICT (user_id, spot_id) DO NOTHING
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (${associationId}, ${userId}, 'preference.added', ${sql.json({ spot_id: spotId })})
  `;

  return NextResponse.json({ ok: true });
}

// DELETE /api/queue/preferences — remove a preference for a spot
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, associationId } = session.user;

  const body = await req.json() as { spotId?: string };
  if (!body.spotId) {
    return NextResponse.json({ error: "spotId krävs" }, { status: 400 });
  }
  const { spotId } = body;

  // Delete scoped to the current user + association — cannot remove another user's preference
  const result = await sql`
    DELETE FROM spot_preferences
    WHERE user_id = ${userId}
      AND spot_id = ${spotId}
      AND association_id = ${associationId}
  `;

  // Only log if something was actually deleted
  if (result.count > 0) {
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (${associationId}, ${userId}, 'preference.removed', ${sql.json({ spot_id: spotId })})
    `;
  }

  return NextResponse.json({ ok: true });
}
