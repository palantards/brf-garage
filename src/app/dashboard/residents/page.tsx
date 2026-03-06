import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InviteForm from "./InviteForm";
import { withdrawInviteAction, removeResidentAction } from "./actions";

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

export default async function ResidentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const now = new Date().toISOString();

  const residents = await sql<ResidentRow[]>`
    SELECT
      u.id, u.email, u.name, u.role, u.invited_at, u.joined_at,
      it.token  AS invite_token,
      it.expires_at AS invite_expires_at,
      it.used_at    AS invite_used_at
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Tillbaka
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Boende</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bjud in boende</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Boende ({residents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn / E-post</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inbjuden</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      Inga boende ännu. Bjud in någon ovan.
                    </TableCell>
                  </TableRow>
                )}
                {residents.map((r) => {
                  const status = getStatus(r, now);
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {r.name ?? <span className="text-gray-400 italic">Ej angivet</span>}
                        </div>
                        <div className="text-sm text-gray-500">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.role === "admin" ? "default" : "secondary"}>
                          {r.role === "admin" ? "Administratör" : "Boende"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {status === "active" && (
                          <Badge variant="outline" className="text-green-600 border-green-200">Aktiv</Badge>
                        )}
                        {status === "pending" && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">Väntar</Badge>
                        )}
                        {status === "expired" && (
                          <Badge variant="outline" className="text-red-500 border-red-200">Utgången</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(r.invited_at).toLocaleDateString("sv-SE")}
                      </TableCell>
                      <TableCell className="text-right">
                        {(status === "pending" || status === "expired") && (
                          <form action={withdrawInviteAction}>
                            <input type="hidden" name="userId" value={r.id} />
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              Återkalla
                            </Button>
                          </form>
                        )}
                        {status === "active" && r.role === "resident" && (
                          <form action={removeResidentAction}>
                            <input type="hidden" name="userId" value={r.id} />
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              Ta bort
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
