"use server";

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

  // Check for existing active user
  const [existing] = await sql<{ joined_at: string | null }[]>`
    SELECT joined_at FROM users
    WHERE association_id = ${associationId} AND email = ${email}
  `;

  if (existing?.joined_at) {
    return { error: "En användare med den e-postadressen finns redan." };
  }

  // Upsert user (re-invite if previously invited but never activated)
  const [user] = await sql<{ id: string }[]>`
    INSERT INTO users (association_id, email, name, role)
    VALUES (${associationId}, ${email}, ${name}, ${role})
    ON CONFLICT (association_id, email)
      DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
    RETURNING id
  `;

  // Invalidate any existing unused tokens and create a fresh one
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
  await sendInviteEmail({
    to: email,
    associationName: "din förening", // TODO: fetch real name
    inviteUrl,
  });

  return { success: `Inbjudan skickad till ${email}.` };
}
