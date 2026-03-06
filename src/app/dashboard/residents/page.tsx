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

export default async function ResidentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const residents = await sql<Resident[]>`
    SELECT id, email, name, role, invited_at, joined_at
    FROM users
    WHERE association_id = ${session.user.associationId}
    ORDER BY invited_at DESC
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
      </main>
    </div>
  );
}
