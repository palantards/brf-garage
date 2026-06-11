import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ApplicationsClient from "./ApplicationsClient";

interface ApplicationRow {
  id: string;
  email: string;
  name: string | null;
  status: string;
  spot_type_preference: string | null;
  agreement_type_preference: string | null;
  created_at: string;
  submitted_at: string | null;
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

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const associationId = session.user.associationId;

  const applications = await sql<ApplicationRow[]>`
    SELECT id, email, name, status, spot_type_preference, agreement_type_preference,
           created_at, submitted_at
    FROM applications
    WHERE association_id = ${associationId}
    ORDER BY
      CASE WHEN status IN ('submitted', 'in_review') THEN 0 ELSE 1 END,
      created_at DESC
  `;

  const total = applications.length;
  const pending = applications.filter((a) => a.status === "submitted" || a.status === "in_review").length;
  const approved = applications.filter((a) => a.status === "approved").length;

  return (
    <ApplicationsClient>
      <div className="p-4 sm:p-8 md:p-12 space-y-8 sm:space-y-12">
        {/* Page heading */}
        <div>
          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none mb-3"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Ansökningar
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-1 w-12 bg-[var(--brf-primary)] rounded-full block" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Hantera ansökningar om garageplats
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Totalt", value: total, icon: "description" },
            { label: "Väntar", value: pending, icon: "pending" },
            { label: "Godkända", value: approved, icon: "check_circle" },
            { label: "Skickade", value: applications.filter((a) => a.status === "form_sent").length, icon: "mail" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[var(--brf-surface)] rounded-xl p-4 sm:p-5 border border-[var(--brf-muted)]/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[var(--brf-on-surface-muted)] text-[18px]">
                  {s.icon}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
                  {s.label}
                </span>
              </div>
              <p
                className="text-2xl sm:text-3xl font-extrabold text-[var(--brf-on-surface)] tracking-tight"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[var(--brf-surface)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--brf-surface-low)] border-b border-[var(--brf-muted)]/10 hover:bg-[var(--brf-surface-low)]">
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">E-post</TableHead>
                  <TableHead className="hidden sm:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Namn</TableHead>
                  <TableHead className="hidden md:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Platstyp</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Status</TableHead>
                  <TableHead className="hidden md:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Skapad</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[var(--brf-on-surface-muted)] py-10 text-sm">
                      Inga ansökningar ännu. Skapa en via knappen ovan.
                    </TableCell>
                  </TableRow>
                )}
                {applications.map((a) => {
                  const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.cancelled;
                  return (
                    <TableRow key={a.id} className="hover:bg-[var(--brf-surface-low)]/30 transition-colors border-b border-[#abb3b7]/5">
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="font-medium text-sm text-[var(--brf-on-surface)]">{a.email}</span>
                        <span className="sm:hidden block text-xs text-[var(--brf-on-surface-muted)]">{a.name}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-6 py-4 text-sm text-[var(--brf-on-surface-muted)]">
                        {a.name || <span className="italic">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-6 py-4 text-sm text-[var(--brf-on-surface-muted)]">
                        {a.spot_type_preference ? SPOT_TYPE_LABELS[a.spot_type_preference] || a.spot_type_preference : "—"}
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: sc.bg, color: sc.color }}
                        >
                          {sc.label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-6 py-4 text-sm text-[var(--brf-on-surface-muted)]">
                        {new Date(a.created_at).toLocaleDateString("sv-SE")}
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <Link
                          href={`/dashboard/applications/${a.id}`}
                          className="text-xs font-semibold text-[var(--brf-primary)] hover:underline"
                        >
                          Visa
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </ApplicationsClient>
  );
}
