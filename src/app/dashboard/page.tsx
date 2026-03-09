import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import SignOutButton from "./SignOutButton";
import QueueCard from "./QueueCard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user } = session;
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "?";

  const isAdmin = user.role === "admin";

  // Queue status for the current user
  const [queueEntry] = await sql<{ id: string; joined_at: string }[]>`
    SELECT id, joined_at FROM queue_entries
    WHERE user_id = ${user.id} AND association_id = ${user.associationId} AND left_at IS NULL
  `;

  const queuePosition = queueEntry
    ? await sql<{ position: number }[]>`
        SELECT COUNT(*)::int AS position FROM queue_entries
        WHERE association_id = ${user.associationId}
          AND left_at IS NULL
          AND queue_entries.joined_at <= ${queueEntry.joined_at}
      `.then(rows => rows[0]?.position ?? null)
    : null;

  const [assignment] = await sql<{ id: string }[]>`
    SELECT id FROM spot_assignments
    WHERE user_id = ${user.id} AND association_id = ${user.associationId} AND ended_at IS NULL
  `;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">BRF Garage</span>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Hej, {user.name ?? user.email}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <Badge variant={isAdmin ? "default" : "secondary"} className="ml-1">
            {isAdmin ? "Administratör" : "Boende"}
          </Badge>
        </div>

        <Separator />

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Garageplan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">
                Se vilka platser som är lediga, upptagna eller erbjudna.
              </p>
              <div className="mt-3">
                <a href="/dashboard/map" className="text-sm font-medium text-blue-600 hover:underline">
                  Visa garageplan →
                </a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Min köplats</CardTitle>
              {isAdmin && (
                <a href="/dashboard/queue" className="text-sm text-gray-400 hover:text-gray-600">
                  Visa kö →
                </a>
              )}
            </CardHeader>
            <CardContent>
              <QueueCard
                position={queuePosition}
                joinedAt={queueEntry?.joined_at ?? null}
                hasAssignment={!!assignment}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aktiva erbjudanden</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Inga aktiva erbjudanden.</p>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Kö</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Se och hantera kön för din förening.
                  </p>
                  <button className="mt-3 text-sm font-medium text-blue-600 hover:underline">
                    Hantera kö →
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Boende</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Bjud in och hantera boende.
                  </p>
                  <a href="/dashboard/residents" className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline">
                    Hantera boende →
                  </a>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Händelselogg</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Alla köhändelser loggas här för transparens.
                  </p>
                  <button className="mt-3 text-sm font-medium text-blue-600 hover:underline">
                    Visa logg →
                  </button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
