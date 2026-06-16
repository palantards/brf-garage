"use server";

import sql from "@/db/client";
import { sendResignationConfirmedEmail } from "@/lib/email";

type State = { error?: string; success?: boolean } | undefined;

export async function confirmResignationAction(
  token: string,
  _prevState: State,
  formData: FormData
): Promise<State> {
  const reason = (formData.get("reason") as string)?.trim() || null;
  const preferredEndDate = (formData.get("preferredEndDate") as string) || null;

  const [resignation] = await sql<{
    id: string;
    association_id: string;
    resident_name: string;
    spot_identifier: string;
  }[]>`
    SELECT id, association_id, resident_name, spot_identifier
    FROM resignations
    WHERE token = ${token} AND status = 'form_sent'
  `;

  if (!resignation) {
    return { error: "Uppsägningen är inte längre giltig." };
  }

  const tx = await sql.reserve();
  try {
    await tx`BEGIN`;

    await tx`
      UPDATE resignations
      SET reason = ${reason},
          preferred_end_date = ${preferredEndDate},
          status = 'confirmed',
          confirmed_at = now()
      WHERE id = ${resignation.id}
    `;

    await tx`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${resignation.association_id},
        NULL,
        'resignation.confirmed',
        ${JSON.stringify({
          resignation_id: resignation.id,
          spot_identifier: resignation.spot_identifier,
        })}
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
    WHERE association_id = ${resignation.association_id} AND role = 'admin'
    ORDER BY invited_at ASC LIMIT 1
  `;

  if (admin) {
    sendResignationConfirmedEmail({
      to: admin.email,
      residentName: resignation.resident_name || "Boende",
      spotIdentifier: resignation.spot_identifier,
    }).catch((err) => console.error("Failed to send resignation confirmed email:", err));
  }

  return { success: true };
}
