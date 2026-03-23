import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { createOfferForSpot } from "@/lib/offers";

/**
 * POST /api/admin/offers — Admin triggers an offer for a specific spot.
 * Body: { spotId: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { spotId } = (await req.json()) as { spotId: string };
  if (!spotId) {
    return NextResponse.json({ error: "spotId krävs" }, { status: 400 });
  }

  const assocId = session.user.associationId;

  // Verify spot exists, is available, and is free
  const [spot] = await sql<{ id: string; identifier: string }[]>`
    SELECT s.id, s.identifier
    FROM spots s
    LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    LEFT JOIN spot_offers so ON so.spot_id = s.id AND so.status = 'pending'
    WHERE s.id = ${spotId}
      AND s.association_id = ${assocId}
      AND s.available = true
      AND sa.id IS NULL
      AND so.id IS NULL
  `;

  if (!spot) {
    return NextResponse.json(
      { error: "Platsen är inte tillgänglig för erbjudande" },
      { status: 409 },
    );
  }

  const result = await createOfferForSpot(spotId, assocId, session.user.id);

  if (!result) {
    return NextResponse.json(
      { error: "Ingen i kön att erbjuda platsen till" },
      { status: 404 },
    );
  }

  return NextResponse.json({ offerId: result.offerId, userId: result.userId });
}
