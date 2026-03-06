import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InviteForm from "./InviteForm";

interface Resident {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "resident";
  invited_at: string;
  joined_at: string | null;
}

interface Invite {
  token: string;
  email: string;
  name: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
}

export default async function ResidentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const associationId = session.user.associationId;
  const now = new Date().toISOString();

  const [residents, invites] = await Promise.all([
    sql<Resident[]>`
      SELECT id, email, name, role, invited_at, joined_at
      FROM users
      WHERE association_id = ${associationId}
      ORDER BY invited_at DESC
    `,
    sql<Invite[]>`
      SELECT it.token, u.email, u.name, it.created_at, it.expires_at, it.used_at
      FROM invite_tokens it
      JOIN users u ON u.id = it.user_id
      WHERE u.association_id = ${associationId}
      ORDER BY it.created_at DESC
    `,
  ]);

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
        {/* Invite form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bjud in boende</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>

        {/* Residents table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Boende ({residents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn / E-post</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inbjuden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-gray-400 py-8"
                    >
                      Inga boende ännu. Bjud in någon ovan.
                    </TableCell>
                  </TableRow>
                )}
                {residents.map((r) => (
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
                      {r.joined_at ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          Aktiv
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                          Inbjuden
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(r.invited_at).toLocaleDateString("sv-SE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Invites table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inbjudningar ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mottagare</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Skickad</TableHead>
                  <TableHead>Går ut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                      Inga inbjudningar skickade ännu.
                    </TableCell>
                  </TableRow>
                )}
                {invites.map((inv) => {
                  const expired = !inv.used_at && inv.expires_at < now;
                  return (
                    <TableRow key={inv.token}>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {inv.name ?? <span className="text-gray-400 italic">Ej angivet</span>}
                        </div>
                        <div className="text-sm text-gray-500">{inv.email}</div>
                      </TableCell>
                      <TableCell>
                        {inv.used_at ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            Aktiverad
                          </Badge>
                        ) : expired ? (
                          <Badge variant="outline" className="text-red-500 border-red-200">
                            Utgången
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                            Väntar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(inv.created_at).toLocaleDateString("sv-SE")}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(inv.expires_at).toLocaleDateString("sv-SE")}
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
