import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

const VALID_VEHICLE_TYPES = ["car", "mc", "electric_car"] as const;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { vehicleType?: string };
  if (!body.vehicleType || !VALID_VEHICLE_TYPES.includes(body.vehicleType as typeof VALID_VEHICLE_TYPES[number])) {
    return NextResponse.json({ error: "Ogiltig fordonstyp" }, { status: 400 });
  }

  await sql`UPDATE users SET vehicle_type = ${body.vehicleType} WHERE id = ${session.user.id}`;

  return NextResponse.json({ ok: true });
}
