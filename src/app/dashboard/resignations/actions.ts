"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import sql from "@/db/client";
import { createOfferForSpot } from "@/lib/offers";
import {
  sendResignationFormEmail,
  sendResignationDecisionEmail,
} from "@/lib/email";

type State = { error?: string; success?: string } | undefined;

export async function createResignationAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const assignmentId = formData.get("assignmentId") as string;
  if (!assignmentId) return { error: "Välj en tilldelning." };

  const associationId = session.user.associationId;

  const [assignment] = await sql<{
    id: string;
    spot_id: string;
    user_id: string;
    agreement_type: string;
    spot_identifier: string;
    user_email: string;
    user_name: string | null;
  }[]>`
    SELECT sa.id, sa.spot_id, sa.user_id, sa.agreement_type,
           s.identifier AS spot_identifier,
           u.email AS user_email, u.name AS user_name
    FROM spot_assignments sa
    JOIN spots s ON s.id = sa.spot_id
    JOIN users u ON u.id = sa.user_id
    WHERE sa.id = ${assignmentId}
      AND sa.association_id = ${associationId}
      AND sa.ended_at IS NULL
      AND sa.ending_at IS NULL
  `;

  if (!assignment) {
    return { error: "Tilldelningen hittades inte eller har redan en uppsägning." };
  }

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM resignations
    WHERE spot_assignment_id = ${assignmentId}
      AND status NOT IN ('rejected', 'cancelled')
  `;

  if (existing) {
    return { error: "Det finns redan en aktiv uppsägning för denna tilldelning." };
  }

  const [res] = await sql<{ id: string; token: string }[]>`
    INSERT INTO resignations (association_id, spot_assignment_id, email, resident_name, spot_identifier, agreement_type)
    VALUES (${associationId}, ${assignmentId}, ${assignment.user_email}, ${assignment.user_name}, ${assignment.spot_identifier}, ${assignment.agreement_type})
    RETURNING id, token
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${associationId},
      ${session.user.id},
      'resignation.created',
      ${JSON.stringify({ resignation_id: res.id, spot_identifier: assignment.spot_identifier, email: assignment.user_email })}
    )
  `;

  const [assoc] = await sql<{ name: string }[]>`
    SELECT name FROM associations WHERE id = ${associationId}
  `;

  const resignUrl = `${process.env.AUTH_URL}/resign/${res.token}`;
  try {
    await sendResignationFormEmail({
      to: assignment.user_email,
      associationName: assoc?.name ?? "din förening",
      spotIdentifier: assignment.spot_identifier,
      resignUrl,
    });
  } catch (err) {
    console.error("Failed to send resignation form email:", err);
    return { error: "Uppsägningen skapades men mejlet misslyckades. Försök igen." };
  }

  revalidatePath("/dashboard/resignations");
  return { success: `Uppsägningsformulär skickat till ${assignment.user_email}.` };
}

export async function reviewResignationAction(
  resignationId: string,
  action: "approve" | "reject"
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const associationId = session.user.associationId;

  const [res] = await sql<{
    id: string;
    email: string;
    resident_name: string | null;
    spot_identifier: string;
    agreement_type: string;
    spot_assignment_id: string;
    status: string;
  }[]>`
    SELECT id, email, resident_name, spot_identifier, agreement_type, spot_assignment_id, status
    FROM resignations
    WHERE id = ${resignationId} AND association_id = ${associationId}
  `;

  if (!res) return { error: "Uppsägningen hittades inte." };
  if (res.status !== "confirmed") {
    return { error: "Uppsägningen kan inte granskas i nuvarande status." };
  }

  const [assoc] = await sql<{ name: string }[]>`
    SELECT name FROM associations WHERE id = ${associationId}
  `;

  if (action === "reject") {
    await sql`
      UPDATE resignations
      SET status = 'rejected',
          reviewed_at = now(),
          reviewed_by = ${session.user.id},
          completed_at = now()
      WHERE id = ${resignationId}
    `;

    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${associationId},
        ${session.user.id},
        'resignation.rejected',
        ${JSON.stringify({ resignation_id: resignationId, spot_identifier: res.spot_identifier })}
      )
    `;

    sendResignationDecisionEmail({
      to: res.email,
      associationName: assoc?.name ?? "din förening",
      spotIdentifier: res.spot_identifier,
      approved: false,
    }).catch((err) => console.error("Failed to send rejection email:", err));

    revalidatePath("/dashboard/resignations");
    return {};
  }

  // Approve — set ending_at and trigger offer
  const interval = res.agreement_type === "temporary" ? "1 month" : "3 months";

  const tx = await sql.reserve();
  try {
    await tx`BEGIN`;

    const [sa] = await tx<{ spot_id: string }[]>`
      UPDATE spot_assignments
      SET ending_at = now() + ${interval}::interval
      WHERE id = ${res.spot_assignment_id}
        AND ended_at IS NULL
      RETURNING spot_id
    `;

    await tx`
      UPDATE resignations
      SET status = 'approved',
          reviewed_at = now(),
          reviewed_by = ${session.user.id},
          completed_at = now()
      WHERE id = ${resignationId}
    `;

    await tx`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${associationId},
        ${session.user.id},
        'resignation.approved',
        ${JSON.stringify({
          resignation_id: resignationId,
          spot_identifier: res.spot_identifier,
          notice_period: interval,
        })}
      )
    `;

    await tx`COMMIT`;

    if (sa) {
      createOfferForSpot(sa.spot_id, associationId, session.user.id).catch((err) =>
        console.error("Failed to create offer after resignation:", err)
      );
    }
  } catch (e) {
    await tx`ROLLBACK`;
    throw e;
  } finally {
    tx.release();
  }

  sendResignationDecisionEmail({
    to: res.email,
    associationName: assoc?.name ?? "din förening",
    spotIdentifier: res.spot_identifier,
    approved: true,
  }).catch((err) => console.error("Failed to send approval email:", err));

  revalidatePath("/dashboard/resignations");
  return {};
}

export async function updateResignationNotesAction(
  resignationId: string,
  notes: string
): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  await sql`
    UPDATE resignations
    SET admin_notes = ${notes}
    WHERE id = ${resignationId}
      AND association_id = ${session.user.associationId}
  `;

  revalidatePath(`/dashboard/resignations/${resignationId}`);
}
