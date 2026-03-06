"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";
import { sendInviteEmail } from "@/lib/email";

type State = { error?: string; success?: string } | undefined;

export async function inviteResidentAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const email = (formData.get("email") as string).trim().toLowerCase();
  const name = (formData.get("name") as string | null)?.trim() || null;
  const role = formData.get("role") as "resident" | "admin";

  if (!email) return { error: "E-postadress krävs." };
  if (!["resident", "admin"].includes(role)) return { error: "Ogiltig roll." };

  const associationId = session.user.associationId;

  const [existing] = await sql<{ joined_at: string | null }[]>`
    SELECT joined_at FROM users
    WHERE association_id = ${associationId} AND email = ${email}
  `;

  if (existing?.joined_at) {
    return { error: "En användare med den e-postadressen finns redan." };
  }

  const [user] = await sql<{ id: string }[]>`
    INSERT INTO users (association_id, email, name, role)
    VALUES (${associationId}, ${email}, ${name}, ${role})
    ON CONFLICT (association_id, email)
      DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    RETURNING id
  `;

  await sql`
    UPDATE invite_tokens SET used_at = now()
    WHERE user_id = ${user.id} AND used_at IS NULL
  `;

  const [token] = await sql<{ token: string }[]>`
    INSERT INTO invite_tokens (user_id) VALUES (${user.id}) RETURNING token
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${associationId},
      ${session.user.id},
      'user.invited',
      ${JSON.stringify({ email, role })}
    )
  `;

  const inviteUrl = `${process.env.AUTH_URL}/invite/${token.token}`;
  await sendInviteEmail({ to: email, associationName: "din förening", inviteUrl });

  revalidatePath("/dashboard/residents");
  return { success: `Inbjudan skickad till ${email}.` };
}

export async function withdrawInviteAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const userId = formData.get("userId") as string;
  const associationId = session.user.associationId;

  // Verify the user belongs to this association and is not yet activated
  const [target] = await sql<{ id: string }[]>`
    SELECT id FROM users
    WHERE id = ${userId}
      AND association_id = ${associationId}
      AND joined_at IS NULL
  `;
  if (!target) return;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    SELECT ${associationId}, ${session.user.id}, 'user.invite_withdrawn', json_build_object('email', email)
    FROM users WHERE id = ${userId}
  `;

  // Deleting the user cascades to invite_tokens
  await sql`DELETE FROM users WHERE id = ${userId}`;

  revalidatePath("/dashboard/residents");
}

export async function removeResidentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const userId = formData.get("userId") as string;
  const associationId = session.user.associationId;

  // Only residents can be removed (not admins), and only within same association
  const [target] = await sql<{ id: string }[]>`
    SELECT id FROM users
    WHERE id = ${userId}
      AND association_id = ${associationId}
      AND role = 'resident'
  `;
  if (!target) return;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    SELECT ${associationId}, ${session.user.id}, 'user.removed', json_build_object('email', email, 'name', name)
    FROM users WHERE id = ${userId}
  `;

  await sql`DELETE FROM users WHERE id = ${userId}`;

  revalidatePath("/dashboard/residents");
}
