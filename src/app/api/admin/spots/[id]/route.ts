import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { createOfferForSpot } from "@/lib/offers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;
  const actorId = session.user.id;
  const { id: spotId } = await params;

  const [spot] = await sql<{ id: string }[]>`
    SELECT id FROM spots WHERE id = ${spotId} AND association_id = ${assocId}
  `;
  if (!spot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { ending_at?: string | null; available?: boolean };

  // ── Set / clear ending_at on the active assignment ──────────────────────────
  if ("ending_at" in body) {
    const [assignment] = await sql<{ id: string }[]>`
      SELECT id FROM spot_assignments
      WHERE spot_id = ${spotId} AND ended_at IS NULL
    `;
    if (!assignment) {
      return NextResponse.json(
        { error: "Ingen aktiv tilldelning för denna plats" },
        { status: 400 },
      );
    }

    const endingAt = body.ending_at ?? null;
    await sql`
      UPDATE spot_assignments SET ending_at = ${endingAt} WHERE id = ${assignment.id}
    `;
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${assocId},
        ${actorId},
        'spot.ending_at_set',
        ${sql.json({ spot_id: spotId, ending_at: endingAt })}
      )
    `;

    // When a notice date is set, immediately trigger an offer to next in queue
    // so they have the full notice period to respond
    if (endingAt) {
      await createOfferForSpot(spotId, assocId, actorId);
    }
  }

  // ── Toggle availability ──────────────────────────────────────────────────────
  if ("available" in body) {
    // Guard: do not allow toggling while spot is actively occupied or offered
    const [activeAssignment] = await sql<{ id: string }[]>`
      SELECT id FROM spot_assignments WHERE spot_id = ${spotId} AND ended_at IS NULL
    `;
    const [activeOffer] = await sql<{ id: string }[]>`
      SELECT id FROM spot_offers WHERE spot_id = ${spotId} AND status = 'pending'
    `;
    if (activeAssignment || activeOffer) {
      return NextResponse.json(
        { error: "Kan inte ändra tillgänglighet på en plats med aktiv tilldelning eller aktivt erbjudande" },
        { status: 409 },
      );
    }

    const available = body.available ?? true;
    await sql`
      UPDATE spots SET available = ${available} WHERE id = ${spotId}
    `;
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${assocId},
        ${actorId},
        'spot.availability_changed',
        ${sql.json({ spot_id: spotId, available })}
      )
    `;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;
  const actorId = session.user.id;
  const { id: spotId } = await params;

  const [spot] = await sql<{ id: string; identifier: string }[]>`
    SELECT id, identifier FROM spots WHERE id = ${spotId} AND association_id = ${assocId}
  `;
  if (!spot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Guard: reject if spot has an active assignment
  const [activeAssignment] = await sql<{ id: string }[]>`
    SELECT id FROM spot_assignments WHERE spot_id = ${spotId} AND ended_at IS NULL
  `;
  if (activeAssignment) {
    return NextResponse.json(
      { error: "Kan inte ta bort en plats med aktiv tilldelning" },
      { status: 409 },
    );
  }

  await sql`DELETE FROM spots WHERE id = ${spotId}`;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${assocId},
      ${actorId},
      'spot.deleted',
      ${sql.json({ spot_id: spotId, identifier: spot.identifier })}
    )
  `;

  return NextResponse.json({ ok: true });
}
