import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";

interface ApplicationDetail {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  apartment_number: string | null;
  status: string;
  spot_type_preference: string | null;
  agreement_type_preference: string | null;
  start_preference: string | null;
  start_date: string | null;
  admin_notes: string | null;
  created_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
}

interface MapSpotRow {
  id: string;
  identifier: string;
  map_type: string;
  map_x: number | null;
  map_y: number | null;
  map_width: number | null;
  map_height: number | null;
  status: string;
  resident_name: string | null;
  ending_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  form_sent: { label: "Formulär skickat", color: "#b45309", bg: "#fef3c7" },
  submitted: { label: "Inskickad", color: "#1d4ed8", bg: "#dbeafe" },
  in_review: { label: "Under granskning", color: "#7c3aed", bg: "#ede9fe" },
  approved: { label: "Godkänd", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Avslagen", color: "#991b1b", bg: "#fee2e2" },
  cancelled: { label: "Avbruten", color: "#6b7280", bg: "#f3f4f6" },
};

const SPOT_TYPE_LABELS: Record<string, string> = {
  car: "Bil",
  mc: "MC",
  electric: "Elbil",
};

const AGREEMENT_TYPE_LABELS: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Tillfälligt",
};

const START_PREF_LABELS: Record<string, string> = {
  asap: "Så snart som möjligt",
  specific_date: "Specifikt datum",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const associationId = session.user.associationId;

  const [app] = await sql<ApplicationDetail[]>`
    SELECT
      a.id, a.email, a.name, a.phone, a.apartment_number,
      a.status, a.spot_type_preference, a.agreement_type_preference,
      a.start_preference, a.start_date, a.admin_notes,
      a.created_at, a.submitted_at, a.reviewed_at,
      reviewer.name AS reviewer_name
    FROM applications a
    LEFT JOIN users reviewer ON reviewer.id = a.reviewed_by
    WHERE a.id = ${id} AND a.association_id = ${associationId}
  `;

  if (!app) notFound();

  const [assoc] = await sql<{ map_status: string }[]>`
    SELECT map_status FROM associations WHERE id = ${associationId}
  `;
  const mapPublished = assoc?.map_status === "published";

  const mapSpots = await sql<MapSpotRow[]>`
    SELECT
      s.id, s.identifier, s.map_type,
      s.map_x, s.map_y, s.map_width, s.map_height,
      CASE
        WHEN sa.id IS NOT NULL AND sa.ending_at IS NOT NULL THEN 'upcoming'
        WHEN sa.id IS NOT NULL                              THEN 'occupied'
        WHEN so.id IS NOT NULL                              THEN 'offered'
        ELSE 'free'
      END AS status,
      u.name AS resident_name,
      sa.ending_at
    FROM spots s
    LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
    LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
    LEFT JOIN users             u ON u.id = sa.user_id
    WHERE s.association_id = ${associationId}
      AND s.available = true
    ORDER BY s.identifier
  `;

  const freeSpots = mapSpots
    .filter((s) => s.status === "free")
    .map((s) => ({ id: s.id, identifier: s.identifier, map_type: s.map_type }));

  const mapSpotsForPicker = mapPublished
    ? mapSpots
        .filter((s) => s.map_x != null)
        .map((s) => ({
          id: s.id,
          label: s.identifier,
          status: s.status as "free" | "occupied" | "offered" | "upcoming",
          x: Number(s.map_x),
          y: Number(s.map_y),
          width: Number(s.map_width),
          height: Number(s.map_height),
          type: s.map_type as "car" | "mc" | undefined,
          residentName: s.resident_name ?? undefined,
          endingAt: s.ending_at ?? undefined,
        }))
    : [];

  const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.cancelled;

  return (
    <div className="p-4 sm:p-8 md:p-12 space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/applications"
        className="inline-flex items-center gap-1 text-sm text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-on-surface)] transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Tillbaka till ansökningar
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none mb-2"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            {app.name || app.email}
          </h2>
          {app.name && (
            <p className="text-sm text-[var(--brf-on-surface-muted)]">{app.email}</p>
          )}
        </div>
        <span
          className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider self-start"
          style={{ backgroundColor: sc.bg, color: sc.color }}
        >
          {sc.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--brf-surface)] rounded-xl p-6 border border-[var(--brf-muted)]/10">
            <h3
              className="text-lg font-bold text-[var(--brf-on-surface)] mb-4"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Ansökningsuppgifter
            </h3>

            {app.status === "form_sent" ? (
              <p className="text-sm text-[var(--brf-on-surface-muted)] italic">
                Formuläret har skickats men inte fyllts i ännu.
              </p>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {[
                  { label: "Namn", value: app.name },
                  { label: "E-post", value: app.email },
                  { label: "Telefon", value: app.phone },
                  { label: "Lägenhet", value: app.apartment_number },
                  {
                    label: "Platstyp",
                    value: app.spot_type_preference
                      ? SPOT_TYPE_LABELS[app.spot_type_preference] || app.spot_type_preference
                      : null,
                  },
                  {
                    label: "Avtalstyp",
                    value: app.agreement_type_preference
                      ? AGREEMENT_TYPE_LABELS[app.agreement_type_preference] || app.agreement_type_preference
                      : null,
                  },
                  {
                    label: "Önskat start",
                    value: app.start_preference
                      ? START_PREF_LABELS[app.start_preference] || app.start_preference
                      : null,
                  },
                  {
                    label: "Startdatum",
                    value: app.start_date
                      ? new Date(app.start_date).toLocaleDateString("sv-SE")
                      : null,
                  },
                ].map((field) => (
                  <div key={field.label}>
                    <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] mb-1">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium text-[var(--brf-on-surface)]">
                      {field.value || <span className="text-[var(--brf-on-surface-muted)] italic">—</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-[var(--brf-surface)] rounded-xl p-6 border border-[var(--brf-muted)]/10">
            <h3
              className="text-lg font-bold text-[var(--brf-on-surface)] mb-4"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Tidslinje
            </h3>
            <div className="space-y-3">
              <TimelineItem
                icon="description"
                label="Ansökan skapad"
                date={app.created_at}
              />
              {app.submitted_at && (
                <TimelineItem
                  icon="send"
                  label="Formulär ifyllt"
                  date={app.submitted_at}
                />
              )}
              {app.reviewed_at && (
                <TimelineItem
                  icon={app.status === "approved" ? "check_circle" : "cancel"}
                  label={
                    app.status === "approved"
                      ? `Godkänd av ${app.reviewer_name || "admin"}`
                      : `Avslagen av ${app.reviewer_name || "admin"}`
                  }
                  date={app.reviewed_at}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Review panel */}
        <div className="lg:col-span-1">
          <ReviewPanel
            applicationId={app.id}
            status={app.status}
            adminNotes={app.admin_notes}
            freeSpots={freeSpots}
            mapSpots={mapSpotsForPicker}
            mapPublished={mapPublished}
          />
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ icon, label, date }: { icon: string; label: string; date: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-[var(--brf-on-surface-muted)] text-[18px]">
        {icon}
      </span>
      <span className="text-sm text-[var(--brf-on-surface)]">{label}</span>
      <span className="text-xs text-[var(--brf-on-surface-muted)] ml-auto">
        {new Date(date).toLocaleDateString("sv-SE", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
