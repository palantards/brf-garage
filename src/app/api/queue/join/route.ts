import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, associationId } = session.user;

  // Check not already in queue
  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM queue_entries
    WHERE user_id = ${userId} AND association_id = ${associationId} AND left_at IS NULL
  `;
  if (existing) return NextResponse.json({ error: "Du står redan i kön" }, { status: 409 });

  // Check not already assigned a spot
  const [assigned] = await sql<{ id: string }[]>`
    SELECT id FROM spot_assignments
    WHERE user_id = ${userId} AND association_id = ${associationId} AND ended_at IS NULL
  `;
  if (assigned) return NextResponse.json({ error: "Du har redan en tilldelad plats" }, { status: 409 });

  const [entry] = await sql<{ id: string }[]>`
    INSERT INTO queue_entries (association_id, user_id)
    VALUES (${associationId}, ${userId})
    RETURNING id
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (${associationId}, ${userId}, 'queue.join', ${sql.json({ queue_entry_id: entry.id })})
  `;

  return NextResponse.json({ ok: true });
}
