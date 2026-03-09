import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GarageMap, { type Spot } from "./GarageMap";
import sql from "@/db/client";

export default async function MapPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assocId = session.user.associationId;
  const isAdmin = session.user.role === "admin";

  const [assoc] = await sql<{ map_image_url: string | null; map_status: string }[]>`
    SELECT map_image_url, map_status FROM associations WHERE id = ${assocId}
  `;

  const rows = await sql<{
    id: string;
    identifier: string;
    map_x: number;
    map_y: number;
    map_width: number;
    map_height: number;
    map_type: string;
    status: string;
    resident_name: string | null;
  }[]>`
    SELECT
      s.id,
      s.identifier,
      s.map_x,
      s.map_y,
      s.map_width,
      s.map_height,
      s.map_type,
      CASE
        WHEN sa.id IS NOT NULL THEN 'occupied'
        WHEN so.id IS NOT NULL THEN 'offered'
        ELSE 'free'
      END AS status,
      u.name AS resident_name
    FROM spots s
    LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    LEFT JOIN spot_offers     so ON so.spot_id = s.id AND so.status = 'pending'
    LEFT JOIN users            u ON u.id = sa.user_id
    WHERE s.association_id = ${assocId}
      AND s.map_x IS NOT NULL
    ORDER BY s.identifier
  `;

  const spots: Spot[] = rows.map(r => ({
    id: r.id,
    label: r.identifier,
    status: r.status as Spot["status"],
    x: Number(r.map_x),
    y: Number(r.map_y),
    width: Number(r.map_width),
    height: Number(r.map_height),
    type: r.map_type as Spot["type"],
    residentName: r.resident_name ?? undefined,
  }));

  const imageUrl = assoc?.map_image_url ?? undefined;
  const mapStatus = assoc?.map_status ?? "unconfigured";
  const hasMap = mapStatus === "ready" && spots.length > 0 && imageUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Tillbaka
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Garageplan</span>
          {isAdmin && (
            <a href="/dashboard/map/editor" className="ml-auto text-sm text-blue-600 hover:underline">
              Redigera karta →
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Garageplan
              {isAdmin && hasMap && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  — klicka på en plats för att hantera den
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasMap ? (
              <GarageMap spots={spots} isAdmin={isAdmin} imageUrl={imageUrl} />
            ) : mapStatus === "pending" ? (
              <div className="py-12 text-center space-y-3">
                <div className="text-3xl">⏳</div>
                <p className="font-medium text-gray-700">Din garageplan bearbetas</p>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Vi har tagit emot din planritning och håller på att konfigurera kartan.
                  Du får ett meddelande när den är klar.
                </p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 pt-2">
                    Uppladdad bild:{" "}
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="underline">
                      visa fil
                    </a>
                  </p>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 space-y-3">
                <p>Ingen garageplan är konfigurerad ännu.</p>
                {isAdmin && (
                  <a href="/dashboard/map/editor" className="text-sm text-blue-600 hover:underline">
                    Ladda upp planritning →
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
