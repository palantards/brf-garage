import { NextRequest, NextResponse } from "next/server";
import { expireStaleOffers } from "@/lib/offers";

/**
 * GET /api/cron/expire-offers — Vercel Cron job to expire stale offers.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expired = await expireStaleOffers();

  return NextResponse.json({ expired });
}
