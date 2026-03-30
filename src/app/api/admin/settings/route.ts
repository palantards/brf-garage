import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [assoc] = await sql<{
    offer_deadline_hours: number;
    ev_priority_only: boolean;
  }[]>`
    SELECT offer_deadline_hours, ev_priority_only
    FROM associations WHERE id = ${session.user.associationId}
  `;

  return NextResponse.json(assoc);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId = session.user.associationId;
  const actorId = session.user.id;
  const body = await req.json() as {
    offer_deadline_hours?: number;
    ev_priority_only?: boolean;
  };

  if ("offer_deadline_hours" in body) {
    const hours = Number(body.offer_deadline_hours);
    if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
      return NextResponse.json({ error: "Deadline måste vara mellan 1 och 720 timmar" }, { status: 400 });
    }
    await sql`UPDATE associations SET offer_deadline_hours = ${hours} WHERE id = ${assocId}`;
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (${assocId}, ${actorId}, 'settings.updated', ${sql.json({ offer_deadline_hours: hours })})
    `;
  }

  if ("ev_priority_only" in body) {
    const val = Boolean(body.ev_priority_only);
    await sql`UPDATE associations SET ev_priority_only = ${val} WHERE id = ${assocId}`;
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (${assocId}, ${actorId}, 'settings.updated', ${sql.json({ ev_priority_only: val })})
    `;
  }

  return NextResponse.json({ ok: true });
}
