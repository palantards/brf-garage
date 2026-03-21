import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withdrawInviteAction, removeResidentAction } from "./actions";
import ResidentsClient from "./ResidentsClient";

interface ResidentRow {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "resident";
  invited_at: string;
  joined_at: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  invite_used_at: string | null;
}

function getStatus(r: ResidentRow, now: string) {
  if (r.joined_at) return "active" as const;
  if (!r.invite_token) return "unknown" as const;
  if (r.invite_used_at) return "active" as const;
  if (r.invite_expires_at && r.invite_expires_at < now) return "expired" as const;
  return "pending" as const;
}

function initials(r: ResidentRow) {
  if (r.name) {
    return r.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return r.email[0].toUpperCase();
}

// Simple deterministic colour from initials so avatars are varied
const avatarColors = ["#dbe1ff", "#dfd5f7", "#e4e2e6", "#d1f2e8", "#fde8d8"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

export default async function ResidentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const now = new Date().toISOString();

  const residents = await sql<ResidentRow[]>`
    SELECT
      u.id, u.email, u.name, u.role, u.invited_at, u.joined_at,
      it.token        AS invite_token,
      it.expires_at   AS invite_expires_at,
      it.used_at      AS invite_used_at
    FROM users u
    LEFT JOIN LATERAL (
      SELECT token, expires_at, used_at
      FROM invite_tokens
      WHERE user_id = u.id
      ORDER BY created_at DESC
      LIMIT 1
    ) it ON true
    WHERE u.association_id = ${session.user.associationId}
    ORDER BY u.invited_at DESC
  `;

  const active = residents.filter((r) => getStatus(r, now) === "active");
  const pending = residents.filter((r) => {
    const s = getStatus(r, now);
    return s === "pending" || s === "expired";
  });

  return (
    <ResidentsClient>
      <div className="p-4 sm:p-8 md:p-12 space-y-8 sm:space-y-12">
        {/* Page heading */}
        <div>
          <h2
            className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#2b3437] leading-none mb-3"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Boende
          </h2>
          <div className="flex items-center gap-3">
            <span className="h-1 w-12 bg-[#0053db] rounded-full block" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#586064]">
              Hantering av föreningsmedlemmar
            </span>
          </div>
        </div>

        {/* Active residents table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#586064] font-medium">
              Visar <span className="text-[#2b3437] font-bold">{active.length}</span> aktiva boende
            </span>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f1f4f6] border-b border-[#abb3b7]/10 hover:bg-[#f1f4f6]">
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#586064]">Namn</TableHead>
                  <TableHead className="hidden sm:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#586064]">E-post</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#586064]">Roll</TableHead>
                  <TableHead className="hidden md:table-cell px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-[#586064]">Status</TableHead>
                  <TableHead className="px-4 sm:px-6 py-4 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#586064] py-10 text-sm">
                      Inga aktiva boende ännu. Bjud in någon via knappen ovan.
                    </TableCell>
                  </TableRow>
                )}
                {active.map((r) => (
                  <TableRow key={r.id} className="hover:bg-[#f1f4f6]/30 transition-colors border-b border-[#abb3b7]/5">
                    <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                          style={{
                            backgroundColor: avatarColor(r.email),
                            color: "#2b3437",
                            fontFamily: "var(--font-manrope), sans-serif",
                          }}
                        >
                          {initials(r)}
                        </div>
                        <div>
                          <span className="font-semibold text-[#2b3437] block">
                            {r.name ?? <span className="text-[#abb3b7] italic font-normal">Ej angivet</span>}
                          </span>
                          {/* Email inline on mobile */}
                          <span className="sm:hidden text-xs text-[#586064]">{r.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-6 py-4 text-sm text-[#586064]">{r.email}</TableCell>
                    <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                      {r.role === "admin" ? (
                        <span className="px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#e2e9ec] text-[#586064]">
                          Boende
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />
                        <span className="text-xs font-bold text-green-600">Aktiv</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                      {r.role === "resident" && (
                        <form action={removeResidentAction}>
                          <input type="hidden" name="userId" value={r.id} />
                          <button
                            type="submit"
                            className="text-xs text-[#586064] hover:text-[#9f403d] transition-colors"
                          >
                            Ta bort
                          </button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </div>
        </section>

        {/* Pending invitations */}
        {pending.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="col-span-1 lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <h3
                  className="text-2xl font-bold text-[#2b3437]"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Väntande inbjudningar
                </h3>
                <Badge className="bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-100">
                  {pending.length} {pending.length === 1 ? "ny" : "nya"}
                </Badge>
              </div>

              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f1f4f6] border-b border-[#abb3b7]/10 hover:bg-[#f1f4f6]">
                      <TableHead className="px-4 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#586064]">E-post</TableHead>
                      <TableHead className="hidden sm:table-cell px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#586064]">Datum skickad</TableHead>
                      <TableHead className="px-4 sm:px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-[#586064]">Status</TableHead>
                      <TableHead className="px-4 sm:px-6 py-3 text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r) => {
                      const status = getStatus(r, now);
                      return (
                        <TableRow key={r.id} className="border-b border-[#abb3b7]/10">
                          <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium text-[#2b3437]">
                            {r.email}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell px-6 py-4 text-sm text-[#586064]">
                            {new Date(r.invited_at).toLocaleDateString("sv-SE")}
                          </TableCell>
                          <TableCell className="px-4 sm:px-6 py-3 sm:py-4">
                            {status === "expired" ? (
                              <span className="text-xs font-bold text-red-500">Utgången</span>
                            ) : (
                              <span className="text-xs font-bold text-amber-600">Väntar</span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 sm:px-6 py-3 sm:py-4 text-right">
                            <form action={withdrawInviteAction}>
                              <input type="hidden" name="userId" value={r.id} />
                              <button
                                type="submit"
                                className="text-xs text-[#586064] hover:text-[#9f403d] transition-colors"
                              >
                                Återkalla
                              </button>
                            </form>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>

            {/* Stats sidebar */}
            <div className="bg-[#f1f4f6] rounded-xl p-8 flex flex-col justify-between border border-[#abb3b7]/10 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#0053db]/5 rounded-full blur-2xl" />
              <div>
                <h4
                  className="text-lg font-bold text-[#2b3437] mb-6"
                  style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                >
                  Statistik
                </h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#586064] mb-1">
                      Totala boende
                    </p>
                    <p
                      className="text-4xl font-extrabold text-[#0053db] tracking-tight"
                      style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                    >
                      {residents.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-[#586064] mb-1">
                      Väntande inbjudningar
                    </p>
                    <p
                      className="text-4xl font-extrabold text-[#2b3437] tracking-tight"
                      style={{ fontFamily: "var(--font-manrope), sans-serif" }}
                    >
                      {pending.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </ResidentsClient>
  );
}
