import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;

  const spots = await sql<{
    id: string;
    identifier: string;
    map_type: string;
    available: boolean;
    status: string;
    resident_name: string | null;
    assignment_id: string | null;
    ending_at: string | null;
  }[]>`
    SELECT
      s.id,
      s.identifier,
      s.map_type,
      s.available,
      CASE
        WHEN s.available = false                              THEN 'unavailable'
        WHEN sa.id IS NOT NULL AND sa.ending_at IS NOT NULL  THEN 'upcoming'
        WHEN sa.id IS NOT NULL                               THEN 'occupied'
        WHEN so.id IS NOT NULL                               THEN 'offered'
        ELSE 'free'
      END AS status,
      u.name  AS resident_name,
      sa.id   AS assignment_id,
      sa.ending_at
    FROM spots s
    LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
    LEFT JOIN users             u  ON u.id = sa.user_id
    WHERE s.association_id = ${assocId}
    ORDER BY s.identifier
  `;

  return NextResponse.json(spots);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;
  const actorId = session.user.id;

  const body = await req.json() as { identifier?: string; type?: string };
  const identifier = body.identifier?.trim();
  const type = body.type === "mc" ? "mc" : body.type === "electric" ? "electric" : "car";

  if (!identifier) {
    return NextResponse.json({ error: "identifier krävs" }, { status: 400 });
  }

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM spots
    WHERE association_id = ${assocId} AND identifier = ${identifier}
  `;
  if (existing) {
    return NextResponse.json(
      { error: "En plats med det identifieraren finns redan" },
      { status: 409 },
    );
  }

  const [spot] = await sql<{ id: string }[]>`
    INSERT INTO spots (association_id, identifier, map_type)
    VALUES (${assocId}, ${identifier}, ${type})
    RETURNING id
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${assocId},
      ${actorId},
      'spot.created',
      ${sql.json({ spot_id: spot.id, identifier, type })}
    )
  `;

  return NextResponse.json({ ok: true, id: spot.id }, { status: 201 });
}
