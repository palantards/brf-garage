import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import Link from "next/link";
import ReviewPanel from "./ReviewPanel";

interface ResignationDetail {
  id: string;
  email: string;
  resident_name: string | null;
  spot_identifier: string;
  agreement_type: string;
  status: string;
  reason: string | null;
  preferred_end_date: string | null;
  admin_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  reviewed_at: string | null;
  reviewer_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  form_sent: { label: "Formulär skickat", color: "#b45309", bg: "#fef3c7" },
  confirmed: { label: "Bekräftad", color: "#1d4ed8", bg: "#dbeafe" },
  approved: { label: "Godkänd", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "Avslagen", color: "#991b1b", bg: "#fee2e2" },
  cancelled: { label: "Avbruten", color: "#6b7280", bg: "#f3f4f6" },
};

const AGREEMENT_LABELS: Record<string, string> = {
  permanent: "Permanent",
  temporary: "Tillfälligt",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResignationDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const associationId = session.user.associationId;

  const [res] = await sql<ResignationDetail[]>`
    SELECT
      r.id, r.email, r.resident_name, r.spot_identifier, r.agreement_type,
      r.status, r.reason, r.preferred_end_date, r.admin_notes,
      r.created_at, r.confirmed_at, r.reviewed_at,
      reviewer.name AS reviewer_name
    FROM resignations r
    LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
    WHERE r.id = ${id} AND r.association_id = ${associationId}
  `;

  if (!res) notFound();

  const sc = STATUS_CONFIG[res.status] || STATUS_CONFIG.cancelled;
  const noticePeriod = res.agreement_type === "temporary" ? "1 månad" : "3 månader";

  return (
    <div className="p-4 sm:p-8 md:p-12 space-y-8">
      {/* Back link */}
      <Link
        href="/dashboard/resignations"
        className="inline-flex items-center gap-1 text-sm text-[var(--brf-on-surface-muted)] hover:text-[var(--brf-on-surface)] transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        Tillbaka till uppsägningar
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none mb-2"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Uppsägning — {res.spot_identifier}
          </h2>
          <p className="text-sm text-[var(--brf-on-surface-muted)]">
            {res.resident_name || res.email}
          </p>
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
              Uppsägningsuppgifter
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {[
                { label: "Boende", value: res.resident_name },
                { label: "E-post", value: res.email },
                { label: "Plats", value: res.spot_identifier },
                { label: "Avtalstyp", value: AGREEMENT_LABELS[res.agreement_type] || res.agreement_type },
                { label: "Uppsägningstid", value: noticePeriod },
                {
                  label: "Önskat slutdatum",
                  value: res.preferred_end_date
                    ? new Date(res.preferred_end_date).toLocaleDateString("sv-SE")
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

            {res.reason && (
              <div className="mt-6 pt-5 border-t border-[var(--brf-muted)]/10">
                <dt className="text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)] mb-2">
                  Anledning
                </dt>
                <dd className="text-sm text-[var(--brf-on-surface)] whitespace-pre-wrap">
                  {res.reason}
                </dd>
              </div>
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
                label="Uppsägning skapad"
                date={res.created_at}
              />
              {res.confirmed_at && (
                <TimelineItem
                  icon="check"
                  label="Bekräftad av boende"
                  date={res.confirmed_at}
                />
              )}
              {res.reviewed_at && (
                <TimelineItem
                  icon={res.status === "approved" ? "check_circle" : "cancel"}
                  label={
                    res.status === "approved"
                      ? `Godkänd av ${res.reviewer_name || "admin"}`
                      : `Avslagen av ${res.reviewer_name || "admin"}`
                  }
                  date={res.reviewed_at}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Review panel */}
        <div className="lg:col-span-1">
          <ReviewPanel
            resignationId={res.id}
            status={res.status}
            adminNotes={res.admin_notes}
            agreementType={res.agreement_type}
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
