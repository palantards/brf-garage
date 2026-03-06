import sql from "@/db/client";
import AcceptInviteForm from "./AcceptInviteForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const [invite] = await sql<
    { email: string; association_name: string }[]
  >`
    SELECT u.email, a.name AS association_name
    FROM invite_tokens it
    JOIN users u ON u.id = it.user_id
    JOIN associations a ON a.id = u.association_id
    WHERE it.token = ${token}
      AND it.used_at IS NULL
      AND it.expires_at > now()
  `;

  if (!invite) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Ogiltig inbjudan
          </h1>
          <p className="text-gray-500 text-sm">
            Den här länken är inte längre giltig. Kontakta din förening.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AcceptInviteForm
      token={token}
      email={invite.email}
      associationName={invite.association_name}
    />
  );
}
