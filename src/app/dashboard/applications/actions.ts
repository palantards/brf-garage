"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import sql from "@/db/client";
import {
  sendApplicationFormEmail,
  sendApplicationDecisionEmail,
} from "@/lib/email";

type State = { error?: string; success?: string } | undefined;

export async function createApplicationAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const email = (formData.get("email") as string).trim().toLowerCase();
  if (!email) return { error: "E-postadress krävs." };

  const associationId = session.user.associationId;

  const [existing] = await sql<{ id: string }[]>`
    SELECT id FROM applications
    WHERE association_id = ${associationId}
      AND email = ${email}
      AND status NOT IN ('rejected', 'cancelled', 'approved')
  `;

  if (existing) {
    return { error: "Det finns redan en aktiv ansökan för den e-postadressen." };
  }

  const [app] = await sql<{ id: string; token: string }[]>`
    INSERT INTO applications (association_id, email)
    VALUES (${associationId}, ${email})
    RETURNING id, token
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${associationId},
      ${session.user.id},
      'application.created',
      ${JSON.stringify({ application_id: app.id, email })}
    )
  `;

  const [assoc] = await sql<{ name: string }[]>`
    SELECT name FROM associations WHERE id = ${associationId}
  `;

  const applyUrl = `${process.env.AUTH_URL}/apply/${app.token}`;
  try {
    await sendApplicationFormEmail({
      to: email,
      associationName: assoc?.name ?? "din förening",
      applyUrl,
    });
  } catch (err) {
    console.error("Failed to send application form email:", err);
    return { error: "Ansökan skapades men mejlet misslyckades. Försök igen." };
  }

  revalidatePath("/dashboard/applications");
  return { success: `Ansökningsformulär skickat till ${email}.` };
}

export async function reviewApplicationAction(
  applicationId: string,
  action: "approve" | "reject",
  approvalAction?: "queue" | "assign",
  spotId?: string
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const associationId = session.user.associationId;

  const [app] = await sql<{
    id: string;
    email: string;
    name: string;
    status: string;
    agreement_type_preference: string | null;
    association_id: string;
  }[]>`
    SELECT id, email, name, status, agreement_type_preference, association_id
    FROM applications
    WHERE id = ${applicationId} AND association_id = ${associationId}
  `;

  if (!app) return { error: "Ansökan hittades inte." };
  if (!["submitted", "in_review"].includes(app.status)) {
    return { error: "Ansökan kan inte granskas i nuvarande status." };
  }

  const [assoc] = await sql<{ name: string }[]>`
    SELECT name FROM associations WHERE id = ${associationId}
  `;

  if (action === "reject") {
    await sql`
      UPDATE applications
      SET status = 'rejected',
          reviewed_at = now(),
          reviewed_by = ${session.user.id},
          completed_at = now()
      WHERE id = ${applicationId}
    `;

    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${associationId},
        ${session.user.id},
        'application.rejected',
        ${JSON.stringify({ application_id: applicationId, email: app.email })}
      )
    `;

    sendApplicationDecisionEmail({
      to: app.email,
      associationName: assoc?.name ?? "din förening",
      applicantName: app.name || app.email,
      approved: false,
    }).catch((err) => console.error("Failed to send rejection email:", err));

    revalidatePath("/dashboard/applications");
    return {};
  }

  // Approve
  const agreementType = app.agreement_type_preference || "permanent";

  const tx = await sql.reserve();
  try {
    await tx`BEGIN`;

    const [user] = await tx<{ id: string }[]>`
      INSERT INTO users (association_id, email, name, role)
      VALUES (${associationId}, ${app.email}, ${app.name}, 'resident')
      ON CONFLICT (association_id, email)
        DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name)
      RETURNING id
    `;

    if (approvalAction === "assign" && spotId) {
      await tx`
        INSERT INTO spot_assignments (association_id, spot_id, user_id, agreement_type)
        VALUES (${associationId}, ${spotId}, ${user.id}, ${agreementType})
      `;
    } else {
      await tx`
        INSERT INTO queue_entries (association_id, user_id)
        VALUES (${associationId}, ${user.id})
      `;
    }

    await tx`
      UPDATE applications
      SET status = 'approved',
          reviewed_at = now(),
          reviewed_by = ${session.user.id},
          completed_at = now()
      WHERE id = ${applicationId}
    `;

    await tx`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${associationId},
        ${session.user.id},
        'application.approved',
        ${JSON.stringify({
          application_id: applicationId,
          email: app.email,
          action: approvalAction || "queue",
          spot_id: spotId || null,
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

  sendApplicationDecisionEmail({
    to: app.email,
    associationName: assoc?.name ?? "din förening",
    applicantName: app.name || app.email,
    approved: true,
  }).catch((err) => console.error("Failed to send approval email:", err));

  revalidatePath("/dashboard/applications");
  return {};
}

export async function updateNotesAction(
  applicationId: string,
  notes: string
): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  await sql`
    UPDATE applications
    SET admin_notes = ${notes}
    WHERE id = ${applicationId}
      AND association_id = ${session.user.associationId}
  `;

  revalidatePath(`/dashboard/applications/${applicationId}`);
}
