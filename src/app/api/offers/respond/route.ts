import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptOffer, declineOffer } from "@/lib/offers";

/**
 * POST /api/offers/respond — Resident accepts or declines a pending offer.
 * Body: { offerId: string, action: "accept" | "decline" }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { offerId, action } = (await req.json()) as {
    offerId: string;
    action: "accept" | "decline";
  };

  if (!offerId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Ogiltiga parametrar" }, { status: 400 });
  }

  const result =
    action === "accept"
      ? await acceptOffer(offerId, session.user.id)
      : await declineOffer(offerId, session.user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
