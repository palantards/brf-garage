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
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: "#f8f9fa" }}
      >
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0053db 0%, #0048c1 100%)" }}
              >
                <span className="material-symbols-outlined text-white text-[20px]">garage</span>
              </div>
              <span
                className="font-extrabold text-2xl tracking-tight text-[#2b3437]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                BRF Garage
              </span>
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-10 text-center relative overflow-hidden"
            style={{ boxShadow: "0 12px 32px rgba(43,52,55,0.06)" }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-1 opacity-80"
              style={{ background: "linear-gradient(135deg, #9f403d 0%, #8a3533 100%)" }}
            />
            <span className="material-symbols-outlined text-[#abb3b7] text-5xl mb-4 block">
              link_off
            </span>
            <h1
              className="text-2xl font-bold text-[#2b3437] mb-2"
              style={{ fontFamily: "var(--font-manrope), sans-serif" }}
            >
              Ogiltig inbjudan
            </h1>
            <p className="text-[#586064] text-sm leading-relaxed">
              Den här länken är inte längre giltig eller har redan använts.<br />
              Kontakta din förening för en ny inbjudan.
            </p>
          </div>
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
