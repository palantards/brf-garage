import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import GarageMap, { type Spot } from "./GarageMap";
import UploadMapModal from "./UploadMapModal";

const LEGEND = [
  { status: "free",     color: "#22c55e", label: "Ledig"    },
  { status: "occupied", color: "#ef4444", label: "Uthyrd"   },
  { status: "upcoming", color: "#f97316", label: "Kommande" },
  { status: "offered",  color: "#f59e0b", label: "Erbjuden" },
] as const;

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
    spots = rows.map((r) => ({
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

  const free     = spots.filter((s) => s.status === "free").length;
  const occupied = spots.filter((s) => s.status === "occupied").length;
  const upcoming = spots.filter((s) => s.status === "upcoming").length;
  const offered  = spots.filter((s) => s.status === "offered").length;

  const statCards = [
    { label: "Lediga",   value: free,     colorClass: "text-emerald-600" },
    { label: "Uthyrda",  value: occupied, colorClass: "text-rose-600"    },
    { label: "Kommande", value: upcoming, colorClass: "text-amber-600"   },
    { label: "Erbjudna", value: offered,  colorClass: "text-yellow-600"  },
  ];


  return (
    <div className="p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10">

      {/* ── Published state ── */}
      {mapStatus === "published" && (
        <>
          {/* Heading */}
          <div className="flex flex-wrap gap-3 justify-between items-end">
            <div>
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--brf-on-surface)]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Garageplan
              </h1>
              <p className="text-[var(--brf-on-surface-muted)] mt-2 text-sm sm:text-base">Visuell översikt av garageplanen.</p>
            </div>
            {isAdmin && (
              <Link
                href="/dashboard/map/editor"
                className="text-[var(--brf-primary)] font-semibold flex items-center gap-1 hover:underline"
              >
                Redigera karta
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            )}
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap gap-4 px-4 py-3 bg-[var(--brf-surface-low)] rounded-xl w-fit">
            {LEGEND.map(({ status, color, label }) => (
              <div key={status} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-[var(--brf-on-surface)]">{label}</span>
              </div>
            ))}
          </div>

          {/* Map */}
          {imageUrl && (
            <div>
              <GarageMap spots={spots} isAdmin={isAdmin} imageUrl={imageUrl} />
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {statCards.map(({ label, value, colorClass }) => (
              <div key={label} className="bg-[var(--brf-surface)] p-6 rounded-xl shadow-sm">
                <p className={`${colorClass} font-bold text-sm uppercase`}>{label}</p>
                <p
                  className="text-4xl font-extrabold mt-1 text-[var(--brf-on-surface)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Non-published states ── */}
      {mapStatus !== "published" && (
        <>
          <div>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[var(--brf-on-surface)]"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Garageplan
            </h1>
          </div>

          <div className="max-w-sm mx-auto py-4">

            {/* STATE: Unconfigured */}
            {mapStatus === "unconfigured" && (
              <div className="bg-[var(--brf-surface)] p-8 rounded-xl shadow-sm border border-[var(--brf-muted)]/20 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-slate-400">map</span>
                </div>
                <h4
                  className="font-extrabold text-xl mb-2 text-[var(--brf-on-surface)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  {isAdmin ? "Ingen garageplan uppladdad" : "Ingen garageplan konfigurerad"}
                </h4>
                <p className="text-[var(--brf-on-surface-muted)] text-sm mb-8 px-4">
                  {isAdmin
                    ? "Ladda upp en planritning så konfigurerar vi kartan åt dig."
                    : "Administratören har ännu inte konfigurerat garagekartan."}
                </p>

                {isAdmin && (
                  <>
                    <div className="w-full space-y-4 mb-8">
                      {[
                        { n: 1, text: "Ladda upp planritning",   active: true  },
                        { n: 2, text: "Vi konfigurerar",         active: false },
                        { n: 3, text: "Granska och publicera",   active: false },
                      ].map(({ n, text, active }) => (
                        <div key={n} className={`flex items-center gap-3 text-left ${active ? "" : "opacity-40"}`}>
                          <span
                            className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0"
                            style={{
                              backgroundColor: active ? "var(--brf-primary)" : "var(--brf-surface-high)",
                              color: active ? "#fff" : "var(--brf-on-surface-muted)",
                            }}
                          >
                            {n}
                          </span>
                          <span className="text-xs font-medium text-[var(--brf-on-surface)]">{text}</span>
                        </div>
                      ))}
                    </div>
                    <UploadMapModal />
                  </>
                )}
              </div>
            )}

            {/* STATE: Pending */}
            {mapStatus === "pending" && (
              <div className="bg-[var(--brf-surface)] p-8 rounded-xl shadow-sm border border-[var(--brf-muted)]/20 flex flex-col items-center text-center justify-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-[var(--brf-primary)]">
                      hourglass_empty
                    </span>
                  </div>
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-[var(--brf-primary)] ring-2 ring-white animate-pulse" />
                </div>
                <h4
                  className="font-extrabold text-xl mb-2 text-[var(--brf-on-surface)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Planritningen granskas
                </h4>
                <p className="text-[var(--brf-on-surface-muted)] text-sm mb-8">
                  Vi har tagit emot din planritning och håller på att konfigurera kartan.
                  Du meddelas när den är klar.
                </p>
              </div>
            )}

            {/* STATE: Review (admin) */}
            {mapStatus === "review" && isAdmin && (
              <div className="bg-blue-50/50 p-8 rounded-xl shadow-sm border-2 border-[var(--brf-primary)]/20 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[var(--brf-primary)] rounded-full flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-3xl text-white">check_circle</span>
                </div>
                <h4
                  className="font-extrabold text-xl mb-2 text-[var(--brf-primary)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Kartan är klar att granska!
                </h4>
                <p className="text-[var(--brf-on-surface-muted)] text-sm mb-8 px-4">
                  Platserna är inlagda. Öppna redigeraren för att justera positioner och sedan publicera.
                </p>
                <Link
                  href="/dashboard/map/editor"
                  className="w-full bg-gradient-to-br from-[var(--brf-primary)] to-[var(--brf-primary-dim)] text-white py-3 px-6 rounded-full font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95"
                >
                  Öppna redigeraren
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            )}

            {/* STATE: Review (resident) */}
            {mapStatus === "review" && !isAdmin && (
              <div className="bg-[var(--brf-surface)] p-8 rounded-xl shadow-sm border border-[var(--brf-muted)]/20 flex flex-col items-center text-center justify-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-[var(--brf-primary)]">
                      hourglass_empty
                    </span>
                  </div>
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-[var(--brf-primary)] ring-2 ring-white animate-pulse" />
                </div>
                <h4
                  className="font-extrabold text-xl mb-2 text-[var(--brf-on-surface)]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Kartan färdigställs
                </h4>
                <p className="text-[var(--brf-on-surface-muted)] text-sm">
                  Vi håller på att slutföra konfigurationen. Du meddelas när kartan är klar.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
