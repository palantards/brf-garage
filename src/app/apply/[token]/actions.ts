"use server";

import sql from "@/db/client";
import { sendApplicationSubmittedEmail } from "@/lib/email";

type State = { error?: string; success?: boolean } | undefined;

export async function submitApplicationAction(
  token: string,
  _prevState: State,
  formData: FormData
): Promise<State> {
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const apartmentNumber = (formData.get("apartmentNumber") as string)?.trim() || null;
  const spotType = formData.get("spotType") as string;
  const agreementType = formData.get("agreementType") as string;
  const startPreference = formData.get("startPreference") as string;
  const startDate = formData.get("startDate") as string | null;

  if (!name) return { error: "Namn krävs." };
  if (!phone) return { error: "Telefonnummer krävs." };
  if (!["car", "mc", "electric"].includes(spotType)) {
    return { error: "Välj en platstyp." };
  }
  if (!["permanent", "temporary"].includes(agreementType)) {
    return { error: "Välj avtalstyp." };
  }
  if (!["asap", "specific_date"].includes(startPreference)) {
    return { error: "Välj startdatum." };
  }
  if (startPreference === "specific_date" && !startDate) {
    return { error: "Ange ett startdatum." };
  }

  const [application] = await sql<{ id: string; association_id: string }[]>`
    SELECT id, association_id FROM applications
    WHERE token = ${token} AND status = 'form_sent'
  `;

  if (!application) {
    return { error: "Ansökan är inte längre giltig." };
  }

  const tx = await sql.reserve();
  try {
    await tx`BEGIN`;

    await tx`
      UPDATE applications
      SET name = ${name},
          phone = ${phone},
          apartment_number = ${apartmentNumber},
          spot_type_preference = ${spotType},
          agreement_type_preference = ${agreementType},
          start_preference = ${startPreference},
          start_date = ${startPreference === "specific_date" ? startDate : null},
          status = 'submitted',
          submitted_at = now()
      WHERE id = ${application.id}
    `;

    await tx`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${application.association_id},
        NULL,
        'application.submitted',
        ${JSON.stringify({ application_id: application.id, name })}
      )
    `;

    await tx`COMMIT`;
  } catch (e) {
    await tx`ROLLBACK`;
    throw e;
  } finally {
    tx.release();
  }

  const [admin] = await sql<{ email: string }[]>`
    SELECT email FROM users
    WHERE association_id = ${application.association_id} AND role = 'admin'
    ORDER BY invited_at ASC LIMIT 1
  `;

  if (admin) {
    sendApplicationSubmittedEmail({
      to: admin.email,
      applicantName: name,
      applicantEmail: name,
    }).catch((err) => console.error("Failed to send submitted notification:", err));
  }

  return { success: true };
}
