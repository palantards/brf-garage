import sql from "@/db/client";
import ApplicationForm from "./ApplicationForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ApplyPage({ params }: Props) {
  const { token } = await params;

  const [application] = await sql<
    { email: string; association_name: string }[]
  >`
    SELECT a.email, assoc.name AS association_name
    FROM applications a
    JOIN associations assoc ON assoc.id = a.association_id
    WHERE a.token = ${token}
      AND a.status = 'form_sent'
  `;

  if (!application) {
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
              Ogiltig ansökan
            </h1>
            <p className="text-[#586064] text-sm leading-relaxed">
              Den här länken är inte längre giltig eller har redan använts.<br />
              Kontakta din förening för en ny ansökningslänk.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ApplicationForm
      token={token}
      email={application.email}
      associationName={application.association_name}
    />
  );
}
