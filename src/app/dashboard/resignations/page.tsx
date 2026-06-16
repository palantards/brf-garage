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
import ResignationsClient from "./ResignationsClient";

interface ResignationRow {
  id: string;
  email: string;
  resident_name: string | null;
  spot_identifier: string;
  agreement_type: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
}

interface AssignmentRow {
  id: string;
  spot_identifier: string;
  user_name: string | null;
  user_email: string;
  agreement_type: string;
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

export default async function ResignationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const associationId = session.user.associationId;

  const [resignations, activeAssignments] = await Promise.all([
    sql<ResignationRow[]>`
      SELECT id, email, resident_name, spot_identifier, agreement_type,
             status, created_at, confirmed_at
      FROM resignations
      WHERE association_id = ${associationId}
      ORDER BY
        CASE WHEN status IN ('confirmed') THEN 0 WHEN status = 'form_sent' THEN 1 ELSE 2 END,
        created_at DESC
    `,
    sql<AssignmentRow[]>`
      SELECT sa.id, s.identifier AS spot_identifier,
             u.name AS user_name, u.email AS user_email,
             sa.agreement_type
      FROM spot_assignments sa
      JOIN spots s ON s.id = sa.spot_id
      JOIN users u ON u.id = sa.user_id
      WHERE sa.association_id = ${associationId}
        AND sa.ended_at IS NULL
        AND sa.ending_at IS NULL
      ORDER BY s.identifier
    `,
  ]);

  const total = resignations.length;
  const pending = resignations.filter((r) => r.status === "confirmed").length;
  const approved = resignations.filter((r) => r.status === "approved").length;

  return (
    <ResignationsClient assignments={activeAssignments}>
      <div className="p-4 sm:p-8 md:p-12 space-y-8 sm:space-y-12">
        {/* Page heading */}
        <div>
          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--brf-on-surface)] leading-none mb-3"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Uppsägningar
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-1 w-12 bg-[var(--brf-primary)] rounded-full block" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--brf-on-surface-muted)]">
              Hantera uppsägningar av garageplats
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Totalt", value: total, icon: "description" },
            { label: "Väntar", value: pending, icon: "pending" },
            { label: "Godkända", value: approved, icon: "check_circle" },
            { label: "Skickade", value: resignations.filter((r) => r.status === "form_sent").length, icon: "mail" },
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
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Boende</TableHead>
                  <TableHead className="hidden sm:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Plats</TableHead>
                  <TableHead className="hidden md:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Avtalstyp</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Status</TableHead>
                  <TableHead className="hidden md:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[var(--brf-on-surface-muted)]">Skapad</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resignations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[var(--brf-on-surface-muted)] py-10 text-sm">
                      Inga uppsägningar ännu.
                    </TableCell>
                  </TableRow>
                )}
                {resignations.map((r) => {
                  const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.cancelled;
                  return (
                    <TableRow key={r.id} className="hover:bg-[var(--brf-surface-low)]/30 transition-colors border-b border-[#abb3b7]/5">
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className="font-medium text-sm text-[var(--brf-on-surface)]">
                          {r.resident_name || r.email}
                        </span>
                        {r.resident_name && (
                          <span className="block text-xs text-[var(--brf-on-surface-muted)]">{r.email}</span>
                        )}
                        <span className="sm:hidden block text-xs text-[var(--brf-on-surface-muted)]">Plats {r.spot_identifier}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell px-6 py-4 text-sm font-medium text-[var(--brf-on-surface)]">
                        {r.spot_identifier}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-6 py-4 text-sm text-[var(--brf-on-surface-muted)]">
                        {AGREEMENT_LABELS[r.agreement_type] || r.agreement_type}
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
                        {new Date(r.created_at).toLocaleDateString("sv-SE")}
                      </TableCell>
                      <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                        <Link
                          href={`/dashboard/resignations/${r.id}`}
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
    </ResignationsClient>
  );
}
