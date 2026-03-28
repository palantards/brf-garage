import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Suspense } from "react";
import AuditLogClient from "./AuditLogClient";

const PAGE_SIZE = 20;

const EVENT_META: Record<string, { label: string; icon: string }> = {
  "queue.join":              { label: "Ny köanmälan",          icon: "login" },
  "queue.leave":             { label: "Lämnade kön",           icon: "logout" },
  "queue.preference.add":    { label: "Intresse markerat",     icon: "bookmark" },
  "queue.preference.remove": { label: "Intresse borttaget",    icon: "bookmark_remove" },
  "spot.created":            { label: "Ny plats skapad",       icon: "directions_car" },
  "spot.updated":            { label: "Plats uppdaterad",      icon: "edit" },
  "spot.deleted":            { label: "Plats borttagen",       icon: "delete" },
  "invite.accepted":         { label: "Inbjudan accepterad",   icon: "person_add" },
  "resident.invited":        { label: "Boende inbjuden",       icon: "mail" },
  "resident.deactivated":    { label: "Boende avaktiverad",    icon: "person_off" },
  "spot.resigned":           { label: "Plats uppsagd",         icon: "exit_to_app" },
  "spot.assignment_ended":   { label: "Tilldelning avslutad",  icon: "person_remove" },
  "spot.assigned":           { label: "Plats tilldelad",       icon: "how_to_reg" },
  "offer.created":           { label: "Erbjudande skickat",    icon: "send" },
  "offer.accepted":          { label: "Erbjudande accepterat", icon: "check_circle" },
  "offer.declined":          { label: "Erbjudande avböjt",     icon: "cancel" },
  "offer.expired":           { label: "Erbjudande utgånget",   icon: "timer_off" },
};

const FILTER_EVENT_TYPES: Record<string, string[]> = {
  queue:     ["queue.join", "queue.leave", "queue.preference.add", "queue.preference.remove"],
  offers:    ["offer.created", "offer.accepted", "offer.declined", "offer.expired"],
  spots:     ["spot.created", "spot.updated", "spot.deleted", "spot.resigned", "spot.assignment_ended", "spot.assigned"],
  residents: ["resident.invited", "resident.deactivated", "invite.accepted"],
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
  const filter = (params.filter && params.filter in FILTER_EVENT_TYPES) ? params.filter : "all";
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
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2b3437] leading-none mb-2"
          style={{ fontFamily: "var(--font-manrope), sans-serif" }}
        >
          Händelselogg
        </h2>
        <p className="text-sm text-[#586064]">
          Fullständig historik över alla händelser i systemet.
        </p>
      </header>

      {/* Filters + table + pagination */}
      <Suspense>
        <AuditLogClient
          filter={filter as "all" | "queue" | "offers" | "spots" | "residents"}
          page={page}
          totalPages={totalPages}
        >
          <div className="bg-white rounded-xl overflow-hidden">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="material-symbols-outlined text-[#abb3b7] mb-4" style={{ fontSize: 48 }}>
                  history
                </span>
                <p className="text-[#586064] font-medium">Inga händelser att visa.</p>
              </div>
            ) : (
              <>
                {events.map((event, i) => {
                  const meta = EVENT_META[event.event_type] ?? { label: event.event_type, icon: "history" };
                  const actor = event.actor_name ?? event.actor_email ?? "System";
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-4 px-5 hover:bg-[#f8f9fa] transition-colors"
                      style={{
                        borderBottom: i < events.length - 1 ? "1px solid rgba(171,179,183,0.12)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-[#0053db]/10 flex items-center justify-center text-[#0053db] shrink-0">
                          <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2b3437]">{meta.label}</p>
                          <p className="text-xs text-[#586064]">{actor}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#586064] whitespace-nowrap ml-4">
                        {formatDate(event.created_at)}
                      </span>
                    </div>
                  );
                })}
                <div className="px-5 py-3 border-t border-[#abb3b7]/10 bg-[#f8f9fa]">
                  <p className="text-xs text-[#586064]">
                    Visar <span className="font-bold text-[#2b3437]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, countResult)}</span> av{" "}
                    <span className="font-bold text-[#2b3437]">{countResult}</span> händelser
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
