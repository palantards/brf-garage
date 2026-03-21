import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div>
      {/* Breadcrumb bar */}
      <div className="px-6 h-11 bg-[#f2f4f6] border-b border-[#c3c6d7]/20 flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/map"
          className="flex items-center gap-1 text-[#434655] hover:text-[#191c1e] font-medium transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
          Garageplan
        </Link>
        <span className="text-[#c3c6d7]">/</span>
        <span className="font-semibold text-[#191c1e]">Kartredigering</span>
      </div>

      <MapEditor
        initialSpots={initialSpots}
        initialImageUrl={assoc?.map_image_url ? "/api/map/image" : null}
        mapStatus={mapStatus}
        unplacedSpots={unplacedSpots}
      />
    </div>
  );
}
