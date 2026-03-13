import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GarageMap, { type Spot } from "./GarageMap";
import UploadMapModal from "./UploadMapModal";
import DeleteMapButton from "./DeleteMapButton";

export default async function MapPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assocId = session.user.associationId;
  const isAdmin = session.user.role === "admin";

  const [assoc] = await sql<{ map_image_url: string | null; map_status: string }[]>`
    SELECT map_image_url, map_status FROM associations WHERE id = ${assocId}
  `;

  const mapStatus = assoc?.map_status ?? "unconfigured";
  const imageUrl = assoc?.map_image_url ? "/api/map/image" : null;

  let spots: Spot[] = [];
  if (mapStatus === "published") {
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
      ending_at: string | null;
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
          WHEN sa.id IS NOT NULL AND sa.ending_at IS NOT NULL THEN 'upcoming'
          WHEN sa.id IS NOT NULL                              THEN 'occupied'
          WHEN so.id IS NOT NULL                              THEN 'offered'
          ELSE 'free'
        END AS status,
        u.name     AS resident_name,
        sa.ending_at
      FROM spots s
      LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
      LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
      LEFT JOIN users             u  ON u.id = sa.user_id
      WHERE s.association_id = ${assocId}
        AND s.map_x IS NOT NULL
        AND s.available = true
      ORDER BY s.identifier
    `;
    spots = rows.map(r => ({
      id: r.id,
      label: r.identifier,
      status: r.status as Spot["status"],
      x: Number(r.map_x),
      y: Number(r.map_y),
      width: Number(r.map_width),
      height: Number(r.map_height),
      type: r.map_type as Spot["type"],
      residentName: r.resident_name ?? undefined,
      endingAt: r.ending_at ?? undefined,
    }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Tillbaka
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Garageplan</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Garageplan</CardTitle>
            {isAdmin && mapStatus === "review" && (
              <a href="/dashboard/map/editor" className="text-sm text-blue-600 hover:underline">
                Granska och publicera →
              </a>
            )}
            {isAdmin && mapStatus === "published" && (
              <a href="/dashboard/map/editor" className="text-sm text-gray-400 hover:text-gray-600">
                Redigera karta →
              </a>
            )}
          </CardHeader>
          <CardContent>

            {/* ── No map yet ── */}
            {mapStatus === "unconfigured" && (
              <div className="py-12 text-center space-y-4">
                {isAdmin ? (
                  <>
                    <p className="text-gray-500 text-sm">
                      Ingen garageplan är uppladdad ännu. Ladda upp en planritning
                      så konfigurerar vi kartan åt dig.
                    </p>
                    <UploadMapModal />
                  </>
                ) : (
                  <p className="text-gray-400 text-sm">Ingen garageplan är konfigurerad ännu.</p>
                )}
              </div>
            )}

            {/* ── Under review by ops ── */}
            {mapStatus === "pending" && (
              <div className="py-12 text-center space-y-3">
                <div className="text-3xl">⏳</div>
                <p className="font-medium text-gray-700">Din garageplan granskas</p>
                <p className="text-sm text-gray-400 max-w-sm mx-auto">
                  Vi har tagit emot din planritning och håller på att konfigurera kartan.
                  Du får ett meddelande när den är klar att granska.
                </p>
                {isAdmin && (
                  <div className="pt-2">
                    <DeleteMapButton />
                  </div>
                )}
              </div>
            )}

            {/* ── Ready for admin review/edit ── */}
            {mapStatus === "review" && (
              <div className="py-12 text-center space-y-4">
                {isAdmin ? (
                  <>
                    <div className="text-3xl">✅</div>
                    <p className="font-medium text-gray-700">Kartan är klar att granska</p>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                      Platserna är inlagda. Öppna redigeraren för att justera och sedan publicera kartan.
                    </p>
                    <a
                      href="/dashboard/map/editor"
                      className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                    >
                      Granska och publicera →
                    </a>
                  </>
                ) : (
                  <>
                    <div className="text-3xl">⏳</div>
                    <p className="font-medium text-gray-700">Kartan färdigställs</p>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                      Vi håller på att slutföra konfigurationen. Du får ett meddelande när kartan är klar.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── Published map ── */}
            {mapStatus === "published" && imageUrl && (
              <GarageMap spots={spots} isAdmin={isAdmin} imageUrl={imageUrl} />
            )}

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
