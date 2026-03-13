import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SpotsTable from "./SpotsTable";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Tillbaka
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Platser</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Platser
              <span className="ml-2 text-sm font-normal text-gray-400">
                {spots.length} {spots.length === 1 ? "plats" : "platser"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <SpotsTable initialSpots={spots} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
