import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import SpotsClient from "./SpotsClient";

export type SpotStatus = "free" | "occupied" | "upcoming" | "offered" | "unavailable";

export interface SpotRow {
  id: string;
  identifier: string;
  map_type: string;
  available: boolean;
  status: SpotStatus;
  resident_name: string | null;
  assignment_id: string | null;
  ending_at: string | null;
  map_x: number | null;
  preference_count: number;
}

export default async function SpotsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const assocId = session.user.associationId;

  const spots = await sql<SpotRow[]>`
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
      sa.ending_at,
      s.map_x,
      COUNT(sp.id) AS preference_count
    FROM spots s
    LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
    LEFT JOIN users             u  ON u.id = sa.user_id
    LEFT JOIN spot_preferences  sp ON sp.spot_id = s.id
    WHERE s.association_id = ${assocId}
    GROUP BY s.id, sa.id, so.id, u.name
    ORDER BY s.identifier
  `;

  const total = spots.length;
  const free = spots.filter((s) => s.status === "free").length;
  const upcoming = spots.filter((s) => s.status === "upcoming").length;

  return (
    <SpotsClient
      initialSpots={spots}
      total={total}
      free={free}
      upcoming={upcoming}
    />
  );
}
