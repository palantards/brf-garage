import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, associationId } = session.user;

  const [entry] = await sql<{ id: string }[]>`
    SELECT id FROM queue_entries
    WHERE user_id = ${userId} AND association_id = ${associationId} AND left_at IS NULL
  `;
  if (!entry) return NextResponse.json({ error: "Du står inte i kön" }, { status: 404 });

  await sql`
    UPDATE queue_entries SET left_at = now()
    WHERE id = ${entry.id}
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (${associationId}, ${userId}, 'queue.leave', ${sql.json({ queue_entry_id: entry.id })})
  `;

  return NextResponse.json({ ok: true });
}
