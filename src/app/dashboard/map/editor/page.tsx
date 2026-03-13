import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import MapEditor, { type EditorSpot } from "./MapEditor";

export default async function MapEditorPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const assocId = session.user.associationId;

  const [assoc] = await sql<{ map_image_url: string | null; map_status: string }[]>`
    SELECT map_image_url, map_status FROM associations WHERE id = ${assocId}
  `;

  const rows = await sql<{
    identifier: string;
    map_x: number;
    map_y: number;
    map_width: number;
    map_height: number;
    map_type: string;
  }[]>`
    SELECT identifier, map_x, map_y, map_width, map_height, map_type
    FROM spots
    WHERE association_id = ${assocId} AND map_x IS NOT NULL
    ORDER BY identifier
  `;

  const initialSpots: EditorSpot[] = rows.map((r, i) => ({
    id: String(i + 1),
    label: r.identifier,
    ocr: false,
    x: Number(r.map_x),
    y: Number(r.map_y),
    width: Number(r.map_width),
    height: Number(r.map_height),
  }));

  const unplacedRows = await sql<{ identifier: string }[]>`
    SELECT identifier FROM spots
    WHERE association_id = ${assocId} AND map_x IS NULL
    ORDER BY identifier
  `;
  const unplacedSpots = unplacedRows.map(r => r.identifier);

  const mapStatus = assoc?.map_status ?? "unconfigured";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard/map" className="text-sm text-gray-500 hover:text-gray-900">
            ← Garageplan
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Redigera karta</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {mapStatus === "pending" && initialSpots.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <strong>Planritning uppladdad —</strong> vi bearbetar den och lägger till platser inom kort.
            Du kan importera JSON manuellt via &quot;Importera JSON&quot; om du vill komma igång direkt.
          </div>
        )}
        {mapStatus === "review" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>Redo att granska —</strong> justera platser vid behov och klicka sedan på{" "}
            <strong>Publicera karta</strong> för att göra den synlig för boende.
          </div>
        )}

        <MapEditor
          initialSpots={initialSpots}
          initialImageUrl={assoc?.map_image_url ? "/api/map/image" : null}
          mapStatus={mapStatus}
          unplacedSpots={unplacedSpots}
        />
      </main>
    </div>
  );
}
