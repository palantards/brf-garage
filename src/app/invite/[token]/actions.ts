"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import sql from "@/db/client";

type State = { error: string } | undefined;

export async function acceptInviteAction(
  token: string,
  _prevState: State,
  formData: FormData
): Promise<State> {
  const name = (formData.get("name") as string).trim();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Lösenorden matchar inte." };
  }
  if (password.length < 8) {
    return { error: "Lösenordet måste vara minst 8 tecken." };
  }

  const [invite] = await sql<{ user_id: string; association_id: string }[]>`
    SELECT u.id AS user_id, u.association_id
    FROM invite_tokens it
    JOIN users u ON u.id = it.user_id
    WHERE it.token = ${token}
      AND it.used_at IS NULL
      AND it.expires_at > now()
  `;

  if (!invite) {
    return { error: "Inbjudan är ogiltig eller har gått ut." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // ReservedSql extends Sql directly (unlike TransactionSql which uses Omit),
  // so it has proper call signatures in TypeScript.
  const tx = await sql.reserve();
  try {
    await tx`BEGIN`;

    await tx`
      UPDATE users
      SET password_hash = ${passwordHash},
          name          = ${name},
          joined_at     = now()
      WHERE id = ${invite.user_id}
    `;

    await tx`
      UPDATE invite_tokens
      SET used_at = now()
      WHERE token = ${token}
    `;

    await tx`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${invite.association_id},
        ${invite.user_id},
        'user.activated',
        ${JSON.stringify({ name })}
      )
    `;

    await tx`COMMIT`;
  } catch (e) {
    await tx`ROLLBACK`;
    throw e;
  } finally {
    tx.release();
  }

  redirect("/login");
}
