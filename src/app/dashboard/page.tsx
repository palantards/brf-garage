import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QueueCard from "./QueueCard";
import OfferCard from "./OfferCard";
import SpotCard from "./SpotCard";

const eventMeta: Record<string, { label: string; icon: string }> = {
  "queue.join":                { label: "Gick med i kön",             icon: "login" },
  "queue.leave":               { label: "Lämnade kön",                icon: "logout" },
  "queue.admin_remove":        { label: "Borttagen från kö av admin", icon: "remove_circle" },
  "preference.added":          { label: "Intresse markerat",          icon: "bookmark" },
  "preference.removed":        { label: "Intresse borttaget",         icon: "bookmark_remove" },
  "offer.created":             { label: "Erbjudande skickat",         icon: "send" },
  "offer.accepted":            { label: "Erbjudande accepterat",      icon: "check_circle" },
  "offer.declined":            { label: "Erbjudande avböjt",          icon: "cancel" },
  "offer.expired":             { label: "Erbjudande utgånget",        icon: "timer_off" },
  "spot.created":              { label: "Ny plats skapad",            icon: "directions_car" },
  "spot.deleted":              { label: "Plats borttagen",            icon: "delete" },
  "spot.resigned":             { label: "Plats uppsagd av boende",    icon: "exit_to_app" },
  "spot.assigned":             { label: "Plats tilldelad",            icon: "how_to_reg" },
  "spot.assignment_ended":     { label: "Tilldelning avslutad",       icon: "person_remove" },
  "spot.ending_at_set":        { label: "Uppsägningsdatum satt",      icon: "event" },
  "spot.availability_changed": { label: "Tillgänglighet ändrad",      icon: "toggle_on" },
  "user.invited":              { label: "Boende inbjuden",            icon: "mail" },
  "user.activated":            { label: "Konto aktiverat",            icon: "person_add" },
  "user.invite_withdrawn":     { label: "Inbjudan återkallad",        icon: "mail_off" },
  "user.removed":              { label: "Boende borttagen",           icon: "person_off" },
  "settings.updated":          { label: "Inställning ändrad",         icon: "settings" },
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

  const [userRecord] = await sql<{ vehicle_type: string }[]>`
    SELECT vehicle_type FROM users WHERE id = ${user.id}
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

  const [assignment] = await sql<{
    id: string;
    spot_identifier: string;
    spot_type: string;
    ending_at: string | null;
  }[]>`
    SELECT sa.id, s.identifier AS spot_identifier, s.map_type AS spot_type, sa.ending_at
    FROM spot_assignments sa
    JOIN spots s ON s.id = sa.spot_id
    WHERE sa.user_id = ${user.id} AND sa.association_id = ${user.associationId} AND sa.ended_at IS NULL
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

  // Pending offer for this user
  const [pendingOffer] = await sql<{
    id: string;
    spot_identifier: string;
    spot_type: string;
    expires_at: string;
  }[]>`
    SELECT so.id, s.identifier AS spot_identifier, s.map_type AS spot_type, so.expires_at
    FROM spot_offers so
    JOIN spots s ON s.id = so.spot_id
    WHERE so.user_id = ${user.id}
      AND so.association_id = ${user.associationId}
      AND so.status = 'pending'
    LIMIT 1
  `;

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
            <h1 className="font-[var(--font-manrope)] text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none">
              Hej, {user.name ?? user.email}
            </h1>
            <Badge className="bg-[var(--brf-surface-high)] text-[var(--brf-on-surface-muted)] text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--brf-surface-high)] rounded-full px-3">
              Administratör
            </Badge>
          </div>
          <p className="text-[var(--brf-on-surface-muted)] max-w-xl">
            Välkommen tillbaka. Här är en sammanfattning av fastighetens aktuella status.
          </p>
        </header>

        {/* Bento stats grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">

          {/* Kö */}
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)] relative overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Kö
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[var(--brf-on-surface)]">
                  {queueCount} i kö
                </p>
                <div className="w-12 h-12 rounded-full bg-[var(--brf-surface-low)] flex items-center justify-center text-[var(--brf-primary)]">
                  <span className="material-symbols-outlined">format_list_numbered</span>
                </div>
              </div>
              <Button variant="link" className="px-0 mt-4 text-[var(--brf-primary)] font-semibold h-auto" render={<Link href="/dashboard/queue" />}>
                Hantera kölista
              </Button>
            </CardContent>
            {/* Watermark */}
            <span
              className="material-symbols-outlined absolute -bottom-4 -right-4 text-[var(--brf-primary)] select-none pointer-events-none"
              style={{ fontSize: 120, opacity: 0.04 }}
            >
              format_list_numbered
            </span>
          </Card>

          {/* Platser */}
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)] border-l-4 border-[var(--brf-primary)]" style={{ borderLeft: "4px solid var(--brf-primary)" }}>
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Platser
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-baseline gap-4 mb-6">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[var(--brf-on-surface)]">
                  {total} totalt
                </p>
                <span className="text-sm text-[var(--brf-on-surface-muted)]">
                  · {free} lediga{upcomingSpots.length > 0 && ` · ${upcomingSpots.length} kommande`}
                </span>
              </div>
              {/* Occupancy bar */}
              <div className="w-full h-2 bg-[var(--brf-surface-high)] rounded-full overflow-hidden flex">
                <div className="h-full bg-[var(--brf-primary)]" style={{ width: `${occupancyPct}%` }} />
                <div className="h-full bg-[var(--brf-primary-tint)]" style={{ width: `${upcomingPct}%` }} />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-[var(--brf-on-surface-muted)]">{occupancyPct}% beläggning</span>
                <Button variant="link" className="px-0 text-[11px] text-[var(--brf-primary)] font-bold h-auto" render={<Link href="/dashboard/spots" />}>
                  Hantera platser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Boende */}
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Boende
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <p className="font-[var(--font-manrope)] text-4xl font-bold text-[var(--brf-on-surface)]">
                  {residentCount} aktiva
                </p>
                <div className="w-12 h-12 rounded-full bg-[var(--brf-surface-low)] flex items-center justify-center text-[var(--brf-primary)]">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </div>
              <Button variant="link" className="px-0 mt-4 text-[var(--brf-primary)] font-semibold h-auto" render={<Link href="/dashboard/residents" />}>
                Hantera boende
              </Button>
            </CardContent>
          </Card>

          {/* Aktiva erbjudanden */}
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Aktiva erbjudanden
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-[var(--font-manrope)] text-4xl font-bold text-[var(--brf-on-surface)]">
                    {offerCount} {offerCount === 1 ? "aktivt" : "aktiva"}
                  </p>
                  {offerCount === 0 && (
                    <p className="text-sm text-[var(--brf-on-surface-muted)] mt-2 italic">Inga väntande erbjudanden</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-[var(--brf-surface-low)] flex items-center justify-center text-[var(--brf-primary)]">
                  <span className="material-symbols-outlined">local_offer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Activity log */}
        <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-[var(--font-manrope)] text-xl font-bold text-[var(--brf-on-surface)]">
              Händelselogg
            </CardTitle>
            <Button variant="link" className="px-0 text-[var(--brf-primary)] font-semibold h-auto text-sm" render={<Link href="/dashboard/audit-log" />}>
              Visa allt
            </Button>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-[var(--brf-on-surface-muted)]">Inga händelser ännu.</p>
            ) : (
              <div>
                {recentEvents.map((event, i) => {
                  const meta = eventMeta[event.event_type] ?? { label: event.event_type, icon: "history" };
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-5 px-4 -mx-4 rounded-lg hover:bg-[var(--brf-surface-hover)] transition-colors"
                      style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid var(--brf-divider)" : "none" }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-full bg-[var(--brf-primary)]/10 flex items-center justify-center text-[var(--brf-primary)] shrink-0">
                          <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--brf-on-surface)]">{meta.label}</span>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] whitespace-nowrap">
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
          <h1 className="font-[var(--font-manrope)] text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-tight">
            Hej, {user.name ?? user.email}
          </h1>
          <Badge className="bg-[var(--brf-surface-high)] text-[var(--brf-on-surface-muted)] text-[11px] uppercase tracking-widest font-bold hover:bg-[var(--brf-surface-high)] rounded-full px-3">
            Boende
          </Badge>
        </div>
        <p className="text-[var(--brf-on-surface-muted)]">Välkommen tillbaka till garageportalen.</p>
      </header>

      {/* Pending offer — shown prominently above everything */}
      {pendingOffer && (
        <div className="mb-6">
          <OfferCard
            offerId={pendingOffer.id}
            spotIdentifier={pendingOffer.spot_identifier}
            spotType={pendingOffer.spot_type}
            expiresAt={pendingOffer.expires_at}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Spot card — shown if user has an active assignment */}
        {assignment && (
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Min plats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <SpotCard
                spotIdentifier={assignment.spot_identifier}
                spotType={assignment.spot_type}
                endingAt={assignment.ending_at}
              />
            </CardContent>
          </Card>
        )}

        {/* Queue card — shown if user has no assignment */}
        {!assignment && (
          <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
            <CardHeader className="pb-0">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
                Min köplats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <QueueCard
                position={queuePosition}
                joinedAt={queueEntry?.joined_at ?? null}
                hasAssignment={false}
                upcomingSpots={upcomingSpots}
                userPreferences={userPreferences}
                vehicleType={(userRecord?.vehicle_type as "car" | "mc" | "electric_car") ?? "car"}
              />
            </CardContent>
          </Card>
        )}

        {/* Map card */}
        <Card className="rounded-xl border-none shadow-none bg-[var(--brf-surface)]">
          <CardHeader className="pb-0">
            <CardTitle className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--brf-on-surface-muted)] font-[var(--font-inter)]">
              Garageplan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-[var(--brf-on-surface-muted)] mb-5">
              Se vilka platser som är lediga, upptagna eller erbjudna.
            </p>
            <Button
              className="bg-[var(--brf-primary)] hover:bg-[var(--brf-primary-dim)] text-white font-semibold rounded-lg gap-2"
              render={<Link href="/dashboard/map" />}
            >
              <span className="material-symbols-outlined text-[18px]">map</span>
              Visa garageplan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
