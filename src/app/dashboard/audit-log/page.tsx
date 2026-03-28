import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Suspense } from "react";
import AuditLogClient from "./AuditLogClient";

const PAGE_SIZE = 20;

const EVENT_META: Record<string, { label: string; icon: string }> = {
  // Queue
  "queue.join":                 { label: "Gick med i kön",              icon: "login" },
  "queue.leave":                { label: "Lämnade kön",                 icon: "logout" },
  "queue.admin_remove":         { label: "Borttagen från kö av admin",  icon: "remove_circle" },
  "preference.added":           { label: "Intresse markerat",           icon: "bookmark" },
  "preference.removed":         { label: "Intresse borttaget",          icon: "bookmark_remove" },
  // Offers
  "offer.created":              { label: "Erbjudande skickat",          icon: "send" },
  "offer.accepted":             { label: "Erbjudande accepterat",       icon: "check_circle" },
  "offer.declined":             { label: "Erbjudande avböjt",           icon: "cancel" },
  "offer.expired":              { label: "Erbjudande utgånget",         icon: "timer_off" },
  // Spots
  "spot.created":               { label: "Ny plats skapad",             icon: "directions_car" },
  "spot.deleted":               { label: "Plats borttagen",             icon: "delete" },
  "spot.resigned":              { label: "Plats uppsagd av boende",     icon: "exit_to_app" },
  "spot.assigned":              { label: "Plats tilldelad",             icon: "how_to_reg" },
  "spot.assignment_ended":      { label: "Tilldelning avslutad",        icon: "person_remove" },
  "spot.ending_at_set":         { label: "Uppsägningsdatum satt",       icon: "event" },
  "spot.availability_changed":  { label: "Tillgänglighet ändrad",       icon: "toggle_on" },
  // Users / residents
  "user.invited":               { label: "Boende inbjuden",             icon: "mail" },
  "user.activated":             { label: "Konto aktiverat",             icon: "person_add" },
  "user.invite_withdrawn":      { label: "Inbjudan återkallad",         icon: "mail_off" },
  "user.removed":               { label: "Boende borttagen",            icon: "person_off" },
};

const FILTER_EVENT_TYPES: Record<string, string[]> = {
  queue:  ["queue.join", "queue.leave", "queue.admin_remove", "preference.added", "preference.removed"],
  offers: ["offer.created", "offer.accepted", "offer.declined", "offer.expired"],
  spots:  ["spot.created", "spot.deleted", "spot.resigned", "spot.assigned", "spot.assignment_ended", "spot.ending_at_set", "spot.availability_changed"],
  users:  ["user.invited", "user.activated", "user.invite_withdrawn", "user.removed"],
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const validFilters = ["all", ...Object.keys(FILTER_EVENT_TYPES)];
  const filter = (params.filter && validFilters.includes(params.filter)) ? params.filter : "all";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const assocId = session.user.associationId;

  const eventTypes = filter !== "all" ? FILTER_EVENT_TYPES[filter] : null;

  const [events, countResult] = await Promise.all([
    eventTypes
      ? sql<{ id: string; event_type: string; created_at: string; actor_name: string | null; actor_email: string | null }[]>`
          SELECT al.id, al.event_type, al.created_at, u.name AS actor_name, u.email AS actor_email
          FROM audit_log al
          LEFT JOIN users u ON u.id = al.actor_id
          WHERE al.association_id = ${assocId}
            AND al.event_type = ANY(${eventTypes})
          ORDER BY al.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `
      : sql<{ id: string; event_type: string; created_at: string; actor_name: string | null; actor_email: string | null }[]>`
          SELECT al.id, al.event_type, al.created_at, u.name AS actor_name, u.email AS actor_email
          FROM audit_log al
          LEFT JOIN users u ON u.id = al.actor_id
          WHERE al.association_id = ${assocId}
          ORDER BY al.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,

    eventTypes
      ? sql<{ count: number }[]>`
          SELECT COUNT(*) AS count FROM audit_log
          WHERE association_id = ${assocId} AND event_type = ANY(${eventTypes})
        `.then((r) => Number(r[0]?.count ?? 0))
      : sql<{ count: number }[]>`
          SELECT COUNT(*) AS count FROM audit_log WHERE association_id = ${assocId}
        `.then((r) => Number(r[0]?.count ?? 0)),
  ]);

  const totalPages = Math.max(1, Math.ceil(countResult / PAGE_SIZE));

  return (
    <div className="p-4 sm:p-8 md:p-12 space-y-6 sm:space-y-10">
      {/* Header */}
      <header>
        <h2
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none mb-2"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          Händelselogg
        </h2>
        <p className="text-sm text-[var(--brf-on-surface-muted)]">
          Fullständig historik över alla händelser i systemet.
        </p>
      </header>

      {/* Filters + table + pagination */}
      <Suspense>
        <AuditLogClient
          filter={filter as "all" | "queue" | "offers" | "spots" | "users"}
          page={page}
          totalPages={totalPages}
        >
          <div className="bg-[var(--brf-surface)] rounded-xl overflow-hidden">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-[var(--brf-muted)] mb-4" style={{ fontSize: 48 }}>
                  history
                </span>
                <p className="text-[var(--brf-on-surface-muted)] font-medium">Inga händelser att visa.</p>
              </div>
            ) : (
              <>
                {events.map((event, i) => {
                  const meta = EVENT_META[event.event_type] ?? { label: event.event_type, icon: "history" };
                  const actor = event.actor_name ?? event.actor_email ?? "System";
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-4 px-5 hover:bg-[var(--brf-surface-hover)] transition-colors"
                      style={{
                        borderBottom: i < events.length - 1 ? "1px solid var(--brf-divider)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-[var(--brf-primary-tint)] flex items-center justify-center text-[var(--brf-primary)] shrink-0">
                          <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--brf-on-surface)]">{meta.label}</p>
                          <p className="text-xs text-[var(--brf-on-surface-muted)]">{actor}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] whitespace-nowrap ml-4">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div className="px-5 py-3 border-t border-[var(--brf-divider)] bg-[var(--brf-surface-hover)]">
                  <p className="text-xs text-[var(--brf-on-surface-muted)]">
                    Visar <span className="font-bold text-[var(--brf-on-surface)]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, countResult)}</span> av{" "}
                    <span className="font-bold text-[var(--brf-on-surface)]">{countResult}</span> händelser
                  </p>
                </div>
              </>
            )}
          </div>
        </AuditLogClient>
      </Suspense>
    </div>
  );
}
