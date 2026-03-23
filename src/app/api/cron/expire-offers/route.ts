import { NextRequest, NextResponse } from "next/server";
import { expireStaleOffers, processExpiredAssignments } from "@/lib/offers";

/**
 * GET /api/cron/expire-offers — Daily Vercel Cron job.
 *
 * 1. Expire stale offers (past deadline) and cascade to next in queue.
 * 2. End assignments where the notice period (ending_at) has passed,
 *    and create new assignments for accepted offers (seamless handover).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [expiredOffers, endedAssignments] = await Promise.all([
    expireStaleOffers(),
    processExpiredAssignments(),
  ]);

  return NextResponse.json({ expiredOffers, endedAssignments });
}
