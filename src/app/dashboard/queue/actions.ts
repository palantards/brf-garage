"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/db/client";

export async function adminRemoveFromQueueAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const userId = formData.get("userId") as string;
  const assocId = session.user.associationId;

  const [entry] = await sql<{ id: string }[]>`
    SELECT qe.id FROM queue_entries qe
    WHERE qe.user_id = ${userId}
      AND qe.association_id = ${assocId}
      AND qe.left_at IS NULL
  `;
  if (!entry) return;

  await sql`
    UPDATE queue_entries SET left_at = now() WHERE id = ${entry.id}
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    SELECT ${assocId}, ${session.user.id}, 'queue.admin_remove',
           json_build_object('user_id', u.id, 'email', u.email, 'name', u.name)
    FROM users u WHERE u.id = ${userId}
  `;

  revalidatePath("/dashboard/queue");
}
