import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const assocId = session.user.associationId;

  const entries = await sql<{
    position: number;
    name: string | null;
    email: string;
    joined_at: string;
  }[]>`
    SELECT
      ROW_NUMBER() OVER (ORDER BY qe.joined_at) AS position,
      u.name,
      u.email,
      qe.joined_at
    FROM queue_entries qe
    JOIN users u ON u.id = qe.user_id
    WHERE qe.association_id = ${assocId}
      AND qe.left_at IS NULL
    ORDER BY qe.joined_at
  `;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Tillbaka
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-semibold text-gray-900">Kö</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Aktiv kö
              <span className="ml-2 text-sm font-normal text-gray-400">
                {entries.length} {entries.length === 1 ? "person" : "personer"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Kön är tom.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium w-12">#</th>
                    <th className="pb-2 font-medium">Namn</th>
                    <th className="pb-2 font-medium">E-post</th>
                    <th className="pb-2 font-medium text-right">Köade sedan</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.email} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 text-gray-400 font-mono">{Number(e.position)}</td>
                      <td className="py-3 font-medium text-gray-900">{e.name ?? "—"}</td>
                      <td className="py-3 text-gray-500">{e.email}</td>
                      <td className="py-3 text-gray-400 text-right">
                        {new Date(e.joined_at).toLocaleDateString("sv-SE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
