import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { sendQueueJoinEmail } from "@/lib/email";

const VALID_VEHICLE_TYPES = ["car", "mc", "electric_car"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: userId, associationId } = session.user;

  // Parse vehicle type from body (optional — defaults to 'car')
  let vehicleType = "car";
  try {
    const body = await req.json() as { vehicleType?: string };
    if (body.vehicleType && VALID_VEHICLE_TYPES.includes(body.vehicleType as typeof VALID_VEHICLE_TYPES[number])) {
      vehicleType = body.vehicleType;
    }
  } catch {
    // No body or invalid JSON — use default
  }

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

  // Save vehicle type on user record
  await sql`UPDATE users SET vehicle_type = ${vehicleType} WHERE id = ${userId}`;

  const [entry] = await sql<{ id: string }[]>`
    INSERT INTO queue_entries (association_id, user_id)
    VALUES (${associationId}, ${userId})
    RETURNING id
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (${associationId}, ${userId}, 'queue.join', ${sql.json({ queue_entry_id: entry.id })})
  `;

  const [user] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
  const [assoc] = await sql<{ name: string }[]>`SELECT name FROM associations WHERE id = ${associationId}`;
  sendQueueJoinEmail({
    to: user.email,
    associationName: assoc?.name ?? "din förening",
  }).catch((err) => console.error("Failed to send queue join email:", err));

  return NextResponse.json({ ok: true });
}
