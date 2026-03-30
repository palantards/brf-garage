import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const [assoc] = await sql<{
    offer_deadline_hours: number;
    ev_priority_only: boolean;
  }[]>`
    SELECT offer_deadline_hours, ev_priority_only
    FROM associations WHERE id = ${session.user.associationId}
  `;

  return (
    <div className="p-4 sm:p-8 md:p-12 max-w-2xl">
      <header className="mb-8">
        <h1 className="font-[var(--font-manrope)] text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--brf-on-surface)]">
          Inställningar
        </h1>
        <p className="text-[var(--brf-on-surface-muted)] mt-1">
          Anpassa regler för erbjudanden och kö.
        </p>
      </header>

      <SettingsForm
        offerDeadlineHours={assoc.offer_deadline_hours}
        evPriorityOnly={assoc.ev_priority_only}
      />
    </div>
  );
}
