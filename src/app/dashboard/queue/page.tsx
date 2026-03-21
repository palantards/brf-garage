import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRemoveFromQueueAction } from "./actions";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const assocId = session.user.associationId;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [entries, stats, freeSpots] = await Promise.all([
    // Queue entries with preference count
    sql<{
      position: number;
      user_id: string;
      name: string | null;
      email: string;
      joined_at: string;
      preference_count: number;
    }[]>`
      SELECT
        ROW_NUMBER() OVER (ORDER BY qe.joined_at)      AS position,
        u.id                                            AS user_id,
        u.name,
        u.email,
        qe.joined_at,
        COUNT(sp.spot_id)                               AS preference_count
      FROM queue_entries qe
      JOIN users u ON u.id = qe.user_id
      LEFT JOIN spot_preferences sp
             ON sp.user_id = u.id AND sp.association_id = qe.association_id
      WHERE qe.association_id = ${assocId}
        AND qe.left_at IS NULL
      GROUP BY qe.id, u.id, u.name, u.email, qe.joined_at
      ORDER BY qe.joined_at
    `,

    // Stats: total in queue, new this month
    sql<{ total: number; new_this_month: number }[]>`
      SELECT
        COUNT(*)                                                        AS total,
        COUNT(*) FILTER (WHERE joined_at >= ${monthStart})             AS new_this_month
      FROM queue_entries
      WHERE association_id = ${assocId} AND left_at IS NULL
    `.then((r) => r[0]),

    // Free spots
    sql<{ count: number }[]>`
      SELECT COUNT(*) AS count
      FROM spots s
      LEFT JOIN spot_assignments sa ON sa.spot_id = s.id AND sa.ended_at IS NULL
      LEFT JOIN spot_offers      so ON so.spot_id = s.id AND so.status = 'pending'
      WHERE s.association_id = ${assocId}
        AND s.available = true
        AND sa.id IS NULL
        AND so.id IS NULL
    `.then((r) => Number(r[0]?.count ?? 0)),
  ]);

  const total = Number(stats?.total ?? 0);
  const newThisMonth = Number(stats?.new_this_month ?? 0);

  return (
    <QueueClient>
    <div className="p-12 space-y-10">

      {/* Page heading */}
      <header className="flex items-end justify-between">
        <div className="space-y-2">
          <h2
            className="text-5xl font-extrabold tracking-tight text-[#2b3437] leading-none"
            style={{ fontFamily: "var(--font-manrope), sans-serif" }}
          >
            Kö
          </h2>
          <div className="flex items-center gap-3">
            <Badge className="bg-[#dbe1ff] text-[#0048bf] text-[11px] font-bold uppercase tracking-widest rounded hover:bg-[#dbe1ff] px-2.5 py-0.5">
              Status: Aktiv
            </Badge>
            <p className="text-sm text-[#586064] font-medium">
              {total} {total === 1 ? "medlem väntar" : "medlemmar väntar"} på plats
            </p>
          </div>
        </div>
      </header>

      {/* Bento stats */}
      <div className="grid grid-cols-3 gap-6">
        {/* Total */}
        <Card className="rounded-xl border-none shadow-sm bg-white border-l-4 border-[#0053db]" style={{ borderLeft: "4px solid #0053db" }}>
          <CardContent className="p-8">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-3">
              Totalt i kö
            </p>
            <p
              className="text-5xl font-extrabold text-[#2b3437]"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {total}
            </p>
            <p className="text-xs text-[#586064] mt-2 font-medium">
              {total === 0 ? "Kön är tom" : `Baserat på FIFO-ordning`}
            </p>
          </CardContent>
        </Card>

        {/* New this month */}
        <Card className="rounded-xl border-none shadow-sm bg-white">
          <CardContent className="p-8">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-3">
              Nya denna månad
            </p>
            <p
              className="text-5xl font-extrabold text-[#0053db]"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {newThisMonth}
            </p>
            <p className="text-xs text-[#586064] mt-2 font-medium">
              {now.toLocaleDateString("sv-SE", { month: "long", year: "numeric" })}
            </p>
          </CardContent>
        </Card>

        {/* Free spots */}
        <Card className="rounded-xl border-none shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-8">
            <p className="text-[10px] font-bold tracking-widest uppercase text-[#586064] mb-3">
              Lediga platser
            </p>
            <p
              className="text-5xl font-extrabold text-[#2b3437]"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              {freeSpots}
            </p>
            <p className="text-xs text-[#586064] mt-2 font-medium">
              {freeSpots === 0 ? "Inga lediga just nu" : "Tillgängliga omgående"}
            </p>
            {/* Watermark */}
            <span
              className="material-symbols-outlined absolute -right-3 -bottom-3 text-[#2b3437] select-none pointer-events-none opacity-[0.06]"
              style={{ fontSize: 96 }}
            >
              directions_car
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Queue table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f1f4f6] border-b border-[#abb3b7]/10 hover:bg-[#f1f4f6]">
              <TableHead className="px-6 py-4 text-[11px] font-bold tracking-widest uppercase text-[#586064]">
                Position
              </TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-bold tracking-widest uppercase text-[#586064]">
                Namn
              </TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-bold tracking-widest uppercase text-[#586064]">
                E-post
              </TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-bold tracking-widest uppercase text-[#586064]">
                Gick med
              </TableHead>
              <TableHead className="px-6 py-4 text-[11px] font-bold tracking-widest uppercase text-[#586064]">
                Preferenser
              </TableHead>
              <TableHead className="px-6 py-4" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-[#586064] py-12 text-sm">
                  Kön är tom.
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => {
              const pos = Number(e.position);
              const prefCount = Number(e.preference_count);
              const isFirst = pos === 1;

              return (
                <TableRow
                  key={e.user_id}
                  className="hover:bg-[#f8f9fa] transition-colors border-b border-[#abb3b7]/5 group"
                >
                  {/* Position circle */}
                  <TableCell className="px-6 py-5">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: isFirst ? "#dbe1ff" : "#eaeff1",
                        color: isFirst ? "#0048bf" : "#2b3437",
                        fontFamily: "var(--font-manrope), sans-serif",
                      }}
                    >
                      {pos}
                    </span>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="px-6 py-5">
                    <p className="font-bold text-[#2b3437]">
                      {e.name ?? <span className="text-[#abb3b7] font-normal italic">Ej angivet</span>}
                    </p>
                  </TableCell>

                  {/* Email */}
                  <TableCell className="px-6 py-5 text-sm text-[#586064]">
                    {e.email}
                  </TableCell>

                  {/* Joined */}
                  <TableCell className="px-6 py-5 text-sm text-[#586064]">
                    {new Date(e.joined_at).toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  {/* Preferences */}
                  <TableCell className="px-6 py-5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaeff1] text-[#586064] text-xs font-semibold">
                      <span className="material-symbols-outlined text-[14px]">
                        {prefCount > 0 ? "bookmark" : "bookmark_border"}
                      </span>
                      {prefCount} {prefCount === 1 ? "val" : "val"}
                    </span>
                  </TableCell>

                  {/* Remove */}
                  <TableCell className="px-6 py-5 text-right">
                    <form action={adminRemoveFromQueueAction}>
                      <input type="hidden" name="userId" value={e.user_id} />
                      <button
                        type="submit"
                        className="p-2 rounded-full text-[#abb3b7] hover:text-[#9f403d] hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Ta bort från kö"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                        <span className="sr-only">Ta bort från kö</span>
                      </button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer */}
        {entries.length > 0 && (
          <div className="px-8 py-4 border-t border-[#abb3b7]/10 bg-[#f8f9fa]">
            <p className="text-xs text-[#586064]">
              Visar <span className="font-bold text-[#2b3437]">{entries.length}</span> {entries.length === 1 ? "person" : "personer"} i kön
            </p>
          </div>
        )}
      </div>
    </div>
    </QueueClient>
  );
}
