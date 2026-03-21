import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QueueCard from "./QueueCard";

const eventMeta: Record<string, { label: string; icon: string }> = {
  "queue.join":              { label: "Ny köanmälan",         icon: "login" },
  "queue.leave":             { label: "Lämnade kön",          icon: "logout" },
  "queue.preference.add":    { label: "Intresse markerat",    icon: "bookmark" },
  "queue.preference.remove": { label: "Intresse borttaget",   icon: "bookmark_remove" },
  "spot.created":            { label: "Ny plats skapad",      icon: "directions_car" },
  "spot.updated":            { label: "Plats uppdaterad",     icon: "edit" },
  "spot.deleted":            { label: "Plats borttagen",      icon: "delete" },
  "invite.accepted":         { label: "Inbjudan accepterad",  icon: "person_add" },
  "resident.invited":        { label: "Boende inbjuden",      icon: "mail" },
  "resident.deactivated":    { label: "Boende avaktiverad",   icon: "person_off" },
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const eventStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  if (eventStart === todayStart) return `Idag ${time}`;
  if (eventStart === todayStart - 86400000) return `Igår ${time}`;
  return date.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;
  const isAdmin = user.role === "admin";

  // Shared queries
  const [queueEntry] = await sql<{ id: string; joined_at: string }[]>`
    SELECT id, joined_at FROM queue_entries
    WHERE user_id = ${user.id} AND association_id = ${user.associationId} AND left_at IS NULL
  `;

  const queuePosition = queueEntry
    ? await sql<{ position: number }[]>`
        SELECT position FROM (
          SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) AS position
          FROM queue_entries
          WHERE association_id = ${user.associationId} AND left_at IS NULL
        ) ranked
        WHERE user_id = ${user.id}
      `.then((rows) => rows[0]?.position ?? null)
    : null;

  const [assignment] = await sql<{ id: string }[]>`
    SELECT id FROM spot_assignments
    WHERE user_id = ${user.id} AND association_id = ${user.associationId} AND ended_at IS NULL
  `;

  const upcomingSpots = await sql<{
    spot_id: string;
    identifier: string;
    map_type: string;
    ending_at: string;
  }[]>`
    SELECT s.id AS spot_id, s.identifier, s.map_type, sa.ending_at
    FROM spots s
    JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    WHERE s.association_id = ${user.associationId}
      AND sa.ending_at IS NOT NULL
      AND s.available = true
    ORDER BY sa.ending_at ASC, s.identifier ASC
  `;

  const userPreferences = queueEntry
    ? await sql<{ spot_id: string }[]>`
        SELECT spot_id FROM spot_preferences
        WHERE user_id = ${user.id} AND association_id = ${user.associationId}
      `.then((rows) => rows.map((r) => r.spot_id))
    : [];

  // Admin-only queries
  const [spotStats, queueCount, residentCount, offerCount, recentEvents] = isAdmin
    ? await Promise.all([
        sql<{ total: number; free: number }[]>`
          SELECT
            COUNT(*)                                                                       AS total,
            COUNT(*) FILTER (WHERE s.available = true AND sa.id IS NULL AND so.id IS NULL) AS free
          FROM spots s
          LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
          LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
          WHERE s.association_id = ${user.associationId}
        `.then((rows) => rows[0]),

        sql<{ count: number }[]>`
          SELECT COUNT(*) AS count FROM queue_entries
          WHERE association_id = ${user.associationId} AND left_at IS NULL
        `.then((rows) => Number(rows[0]?.count ?? 0)),

        sql<{ count: number }[]>`
          SELECT COUNT(*) AS count FROM users
          WHERE association_id = ${user.associationId}
        `.then((rows) => Number(rows[0]?.count ?? 0)),

        sql<{ count: number }[]>`
          SELECT COUNT(*) AS count FROM spot_offers
          WHERE association_id = ${user.associationId} AND status = 'pending'
        `.then((rows) => Number(rows[0]?.count ?? 0)),

        sql<{ id: string; event_type: string; created_at: string }[]>`
          SELECT id, event_type, created_at FROM audit_log
          WHERE association_id = ${user.associationId}
          ORDER BY created_at DESC LIMIT 8
        `,
      ])
    : [null, 0, 0, 0, [] as { id: string; event_type: string; created_at: string }[]];

  // ── Admin view ──────────────────────────────────────────────────────────────
  if (isAdmin) {
    const total = Number(spotStats?.total ?? 0);
    const free = Number(spotStats?.free ?? 0);
    const occupied = total - free - upcomingSpots.length;
    const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const upcomingPct = total > 0 ? Math.round((upcomingSpots.length / total) * 100) : 0;

    return (
      <div className="p-4 sm:p-8 md:p-12">
        {/* Welcome */}
        <header className="mb-8 sm:mb-14">
          <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 mb-2">
            <h1 className="font-[var(--font-manrope)] text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2b3437] leading-none">
              Hej, {user.name ?? user.email}
            </h1>
            <Badge className="bg-[#e2e9ec] text-[#586064] text-[11px] uppercase tracking-widest font-bold hover:bg-[#e2e9ec] rounded-full px-3">
              Administratör
            </Badge>
          </div>
          <p className="text-[#586064] max-w-xl">
            Välkommen tillbaka. Här är en sammanfattning av fastighetens aktuella status.
          </p>
        </header>

        {/* Bento stats grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">

          {/* Kö */}
          <Card className="rounded-xl border-none shadow-none bg-white relative overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
                Kö
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[#2b3437]">
                  {queueCount} i kö
                </p>
                <div className="w-12 h-12 rounded-full bg-[#f1f4f6] flex items-center justify-center text-[#0053db]">
                  <span className="material-symbols-outlined">format_list_numbered</span>
                </div>
              </div>
              <Button variant="link" className="px-0 mt-4 text-[#0053db] font-semibold h-auto" asChild>
                <Link href="/dashboard/queue">Hantera kölista</Link>
              </Button>
            </CardContent>
            {/* Watermark */}
            <span
              className="material-symbols-outlined absolute -bottom-4 -right-4 text-[#0053db] select-none pointer-events-none"
              style={{ fontSize: 120, opacity: 0.04 }}
            >
              format_list_numbered
            </span>
          </Card>

          {/* Platser */}
          <Card className="rounded-xl border-none shadow-none bg-white border-l-4 border-[#0053db]" style={{ borderLeft: "4px solid #0053db" }}>
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
                Platser
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-4 mb-6">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[#2b3437]">
                  {total} totalt
                </p>
                <span className="text-sm text-[#586064]">
                  · {free} lediga{upcomingSpots.length > 0 && ` · ${upcomingSpots.length} kommande`}
                </span>
              </div>
              {/* Occupancy bar */}
              <div className="w-full h-2 bg-[#dbe4e7] rounded-full overflow-hidden flex">
                <div className="h-full bg-[#0053db]" style={{ width: `${occupancyPct}%` }} />
                <div className="h-full bg-[#dbe1ff]" style={{ width: `${upcomingPct}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-[#586064]">{occupancyPct}% beläggning</span>
                <Button variant="link" className="px-0 text-[11px] text-[#0053db] font-bold h-auto" asChild>
                  <Link href="/dashboard/spots">Hantera platser</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Boende */}
          <Card className="rounded-xl border-none shadow-none bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
                Boende
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[#2b3437]">
                  {residentCount} aktiva
                </p>
                <div className="w-12 h-12 rounded-full bg-[#f1f4f6] flex items-center justify-center text-[#0053db]">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </div>
              <Button variant="link" className="px-0 mt-4 text-[#0053db] font-semibold h-auto" asChild>
                <Link href="/dashboard/residents">Hantera boende</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Aktiva erbjudanden */}
          <Card className="rounded-xl border-none shadow-none bg-white">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
                Aktiva erbjudanden
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-[var(--font-manrope)] text-4xl font-bold text-[#2b3437]">
                    {offerCount} {offerCount === 1 ? "aktivt" : "aktiva"}
                  </p>
                  {offerCount === 0 && (
                    <p className="text-sm text-[#586064] mt-2 italic">Inga väntande erbjudanden</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f1f4f6] flex items-center justify-center text-[#0053db]">
                  <span className="material-symbols-outlined">local_offer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Activity log */}
        <Card className="rounded-xl border-none shadow-none bg-white">
          <CardHeader>
            <CardTitle className="font-[var(--font-manrope)] text-xl font-bold text-[#2b3437]">
              Händelselogg
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-[#586064]">Inga händelser ännu.</p>
            ) : (
              <div>
                {recentEvents.map((event, i) => {
                  const meta = eventMeta[event.event_type] ?? { label: event.event_type, icon: "history" };
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-5 px-4 -mx-4 rounded-lg hover:bg-[#f8f9fa] transition-colors"
                      style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid rgba(171,179,183,0.12)" : "none" }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-[#0053db]/10 flex items-center justify-center text-[#0053db] shrink-0">
                          <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#2b3437]">{meta.label}</span>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064] whitespace-nowrap">
                        {formatEventDate(event.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Resident view ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8 md:p-12">
      <header className="mb-6 sm:mb-10">
        <div className="flex flex-wrap items-baseline gap-3 mb-1">
          <h1 className="font-[var(--font-manrope)] text-2xl sm:text-4xl font-extrabold tracking-tight text-[#2b3437] leading-tight">
            Hej, {user.name ?? user.email}
          </h1>
          <Badge className="bg-[#e2e9ec] text-[#586064] text-[11px] uppercase tracking-widest font-bold hover:bg-[#e2e9ec] rounded-full px-3">
            Boende
          </Badge>
        </div>
        <p className="text-[#586064]">Välkommen tillbaka till garageportalen.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Queue card */}
        <Card className="rounded-xl border-none shadow-none bg-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
              Min köplats
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <QueueCard
              position={queuePosition}
              joinedAt={queueEntry?.joined_at ?? null}
              hasAssignment={!!assignment}
              upcomingSpots={upcomingSpots}
              userPreferences={userPreferences}
            />
          </CardContent>
        </Card>

        {/* Map card */}
        <Card className="rounded-xl border-none shadow-none bg-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#586064] font-[var(--font-inter)]">
              Garageplan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-[#586064] mb-5">
              Se vilka platser som är lediga, upptagna eller erbjudna.
            </p>
            <Button
              className="bg-[#0053db] hover:bg-[#0048c1] text-white font-semibold rounded-lg gap-2"
              asChild
            >
              <Link href="/dashboard/map">
                <span className="material-symbols-outlined text-[18px]">map</span>
                Visa garageplan
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
