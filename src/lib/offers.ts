import sql from "@/db/client";
import { sendAssignmentConfirmationEmail, sendOfferEmail, sendOfferExpiredEmail, sendOfferReminderEmail } from "@/lib/email";

/**
 * Find the next eligible person in queue for a given spot.
 *
 * Priority:
 * 1. Users who have a spot_preference for this spot — ordered by queue position (FIFO)
 * 2. Fall back to pure FIFO if nobody expressed a preference
 *
 * Skips users who already have a pending offer for ANY spot.
 */
export async function findNextEligible(
  spotId: string,
  assocId: string,
): Promise<{ userId: string; queueEntryId: string } | null> {
  // First: try users with a preference for this spot, ordered by queue position
  const [preferred] = await sql<{ user_id: string; queue_entry_id: string }[]>`
    SELECT qe.user_id, qe.id AS queue_entry_id
    FROM queue_entries qe
    JOIN spot_preferences sp ON sp.user_id = qe.user_id AND sp.spot_id = ${spotId}
    WHERE qe.association_id = ${assocId}
      AND qe.left_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM spot_offers so
        WHERE so.user_id = qe.user_id AND so.status = 'pending'
      )
    ORDER BY qe.joined_at ASC
    LIMIT 1
  `;

  if (preferred) {
    return { userId: preferred.user_id, queueEntryId: preferred.queue_entry_id };
  }

  // Fallback: pure FIFO
  const [next] = await sql<{ user_id: string; queue_entry_id: string }[]>`
    SELECT qe.user_id, qe.id AS queue_entry_id
    FROM queue_entries qe
    WHERE qe.association_id = ${assocId}
      AND qe.left_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM spot_offers so
        WHERE so.user_id = qe.user_id AND so.status = 'pending'
      )
    ORDER BY qe.joined_at ASC
    LIMIT 1
  `;

  return next ? { userId: next.user_id, queueEntryId: next.queue_entry_id } : null;
}

/**
 * Create an offer for a spot to the next eligible person in queue.
 * Returns the created offer or null if nobody is eligible.
 */
export async function createOfferForSpot(
  spotId: string,
  assocId: string,
  actorId: string | null,
): Promise<{ offerId: string; userId: string } | null> {
  const eligible = await findNextEligible(spotId, assocId);
  if (!eligible) return null;

  // Get association details + offer deadline
  const [assoc] = await sql<{ name: string; offer_deadline_hours: number }[]>`
    SELECT name, offer_deadline_hours FROM associations WHERE id = ${assocId}
  `;
  const deadlineHours = assoc?.offer_deadline_hours ?? 48;

  // Get spot identifier and user email for the notification
  const [spot] = await sql<{ identifier: string }[]>`
    SELECT identifier FROM spots WHERE id = ${spotId}
  `;
  const [user] = await sql<{ email: string }[]>`
    SELECT email FROM users WHERE id = ${eligible.userId}
  `;

  const [offer] = await sql<{ id: string; expires_at: string }[]>`
    INSERT INTO spot_offers (association_id, spot_id, user_id, queue_entry_id, expires_at)
    VALUES (
      ${assocId},
      ${spotId},
      ${eligible.userId},
      ${eligible.queueEntryId},
      now() + make_interval(hours => ${deadlineHours})
    )
    RETURNING id, expires_at
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${assocId},
      ${actorId},
      'offer.created',
      ${sql.json({ offer_id: offer.id, spot_id: spotId, user_id: eligible.userId, deadline_hours: deadlineHours })}
    )
  `;

  // Send email notification (non-blocking — don't fail the offer if email fails)
  sendOfferEmail({
    to: user.email,
    associationName: assoc?.name ?? "din förening",
    spotIdentifier: spot.identifier,
    expiresAt: new Date(offer.expires_at),
  }).catch((err) => {
    console.error("Failed to send offer email:", err);
  });

  return { offerId: offer.id, userId: eligible.userId };
}

/**
 * Accept an offer: create assignment, remove from queue, clean up preferences.
 */
export async function acceptOffer(
  offerId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  // Verify the offer belongs to this user and is still pending
  const [offer] = await sql<{
    id: string;
    spot_id: string;
    association_id: string;
    queue_entry_id: string;
    status: string;
    expires_at: string;
  }[]>`
    SELECT id, spot_id, association_id, queue_entry_id, status, expires_at
    FROM spot_offers
    WHERE id = ${offerId} AND user_id = ${userId}
  `;

  if (!offer) return { success: false, error: "Erbjudande hittades inte" };
  if (offer.status !== "pending") return { success: false, error: "Erbjudandet är inte längre aktivt" };
  if (new Date(offer.expires_at) < new Date()) {
    // Expire it
    await sql`UPDATE spot_offers SET status = 'expired' WHERE id = ${offerId}`;
    return { success: false, error: "Erbjudandet har gått ut" };
  }

  // 1. Accept the offer
  await sql`
    UPDATE spot_offers SET status = 'accepted', responded_at = now()
    WHERE id = ${offerId}
  `;

  // 2. Create spot assignment only if spot is actually free right now.
  //    If there's still an active assignment (spot is "upcoming" — current tenant
  //    gave notice but hasn't left yet), the daily cron will handle the handover
  //    when ending_at passes.
  const [activeAssignment] = await sql<{ id: string }[]>`
    SELECT id FROM spot_assignments
    WHERE spot_id = ${offer.spot_id} AND ended_at IS NULL
  `;
  if (!activeAssignment) {
    await sql`
      INSERT INTO spot_assignments (association_id, spot_id, user_id)
      VALUES (${offer.association_id}, ${offer.spot_id}, ${userId})
    `;

    // Notify resident of their new assignment
    const [assignUser] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${userId}`;
    const [assignSpot] = await sql<{ identifier: string }[]>`SELECT identifier FROM spots WHERE id = ${offer.spot_id}`;
    const [assignAssoc] = await sql<{ name: string }[]>`SELECT name FROM associations WHERE id = ${offer.association_id}`;
    sendAssignmentConfirmationEmail({
      to: assignUser.email,
      associationName: assignAssoc?.name ?? "din förening",
      spotIdentifier: assignSpot.identifier,
    }).catch((err) => console.error("Failed to send assignment confirmation email:", err));
  }

  // 3. Remove from queue
  await sql`
    UPDATE queue_entries SET left_at = now()
    WHERE id = ${offer.queue_entry_id}
  `;

  // 4. Clean up user's spot preferences
  await sql`
    DELETE FROM spot_preferences
    WHERE user_id = ${userId} AND association_id = ${offer.association_id}
  `;

  // 5. Audit log
  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${offer.association_id},
      ${userId},
      'offer.accepted',
      ${sql.json({ offer_id: offerId, spot_id: offer.spot_id })}
    )
  `;

  return { success: true };
}

/**
 * Decline an offer and automatically trigger the next offer for the same spot.
 */
export async function declineOffer(
  offerId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const [offer] = await sql<{
    id: string;
    spot_id: string;
    association_id: string;
    status: string;
  }[]>`
    SELECT id, spot_id, association_id, status
    FROM spot_offers
    WHERE id = ${offerId} AND user_id = ${userId}
  `;

  if (!offer) return { success: false, error: "Erbjudande hittades inte" };
  if (offer.status !== "pending") return { success: false, error: "Erbjudandet är inte längre aktivt" };

  await sql`
    UPDATE spot_offers SET status = 'declined', responded_at = now()
    WHERE id = ${offerId}
  `;

  await sql`
    INSERT INTO audit_log (association_id, actor_id, event_type, payload)
    VALUES (
      ${offer.association_id},
      ${userId},
      'offer.declined',
      ${sql.json({ offer_id: offerId, spot_id: offer.spot_id })}
    )
  `;

  // Auto-cascade: offer to next person
  await createOfferForSpot(offer.spot_id, offer.association_id, null);

  return { success: true };
}

/**
 * Expire all stale offers and cascade to next in queue for each.
 * Called by cron job.
 */
export async function expireStaleOffers(): Promise<number> {
  const stale = await sql<{ id: string; spot_id: string; association_id: string; user_id: string }[]>`
    UPDATE spot_offers
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < now()
    RETURNING id, spot_id, association_id, user_id
  `;

  for (const offer of stale) {
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${offer.association_id},
        NULL,
        'offer.expired',
        ${sql.json({ offer_id: offer.id, spot_id: offer.spot_id, user_id: offer.user_id })}
      )
    `;

    // Notify the resident their offer lapsed
    const [user] = await sql<{ email: string }[]>`
      SELECT email FROM users WHERE id = ${offer.user_id}
    `;
    const [spot] = await sql<{ identifier: string }[]>`
      SELECT identifier FROM spots WHERE id = ${offer.spot_id}
    `;
    const [assoc] = await sql<{ name: string }[]>`
      SELECT name FROM associations WHERE id = ${offer.association_id}
    `;
    sendOfferExpiredEmail({
      to: user.email,
      associationName: assoc?.name ?? "din förening",
      spotIdentifier: spot.identifier,
    }).catch((err) => {
      console.error("Failed to send offer expired email:", err);
    });

    // Cascade to next person
    await createOfferForSpot(offer.spot_id, offer.association_id, null);
  }

  return stale.length;
}

/**
 * Handle assignment handovers for spots where the notice period has passed.
 *
 * When ending_at <= now():
 * 1. End the old assignment (set ended_at = now())
 * 2. If there's an accepted offer for this spot, create the new assignment
 *
 * Called by the daily cron job.
 */
export async function processExpiredAssignments(): Promise<number> {
  const expired = await sql<{ id: string; spot_id: string; association_id: string; user_id: string }[]>`
    UPDATE spot_assignments
    SET ended_at = now(), ending_at = NULL
    WHERE ended_at IS NULL
      AND ending_at IS NOT NULL
      AND ending_at <= now()
    RETURNING id, spot_id, association_id, user_id
  `;

  for (const assignment of expired) {
    await sql`
      INSERT INTO audit_log (association_id, actor_id, event_type, payload)
      VALUES (
        ${assignment.association_id},
        NULL,
        'spot.assignment_ended',
        ${sql.json({ spot_id: assignment.spot_id, user_id: assignment.user_id, reason: 'notice_period_expired' })}
      )
    `;

    // Check if someone already accepted an offer for this spot
    const [accepted] = await sql<{ id: string; user_id: string }[]>`
      SELECT id, user_id FROM spot_offers
      WHERE spot_id = ${assignment.spot_id}
        AND status = 'accepted'
      ORDER BY responded_at DESC
      LIMIT 1
    `;

    if (accepted) {
      // Create the new assignment for the person who accepted
      await sql`
        INSERT INTO spot_assignments (association_id, spot_id, user_id)
        VALUES (${assignment.association_id}, ${assignment.spot_id}, ${accepted.user_id})
      `;
      await sql`
        INSERT INTO audit_log (association_id, actor_id, event_type, payload)
        VALUES (
          ${assignment.association_id},
          NULL,
          'spot.assigned',
          ${sql.json({ spot_id: assignment.spot_id, user_id: accepted.user_id, offer_id: accepted.id })}
        )
      `;

      const [handoverUser] = await sql<{ email: string }[]>`SELECT email FROM users WHERE id = ${accepted.user_id}`;
      const [handoverSpot] = await sql<{ identifier: string }[]>`SELECT identifier FROM spots WHERE id = ${assignment.spot_id}`;
      const [handoverAssoc] = await sql<{ name: string }[]>`SELECT name FROM associations WHERE id = ${assignment.association_id}`;
      sendAssignmentConfirmationEmail({
        to: handoverUser.email,
        associationName: handoverAssoc?.name ?? "din förening",
        spotIdentifier: handoverSpot.identifier,
      }).catch((err) => console.error("Failed to send assignment confirmation email:", err));
    } else {
      // No one accepted yet — trigger a new offer if there's still someone in queue
      await createOfferForSpot(assignment.spot_id, assignment.association_id, null);
    }
  }

  return expired.length;
}

/**
 * Send reminder emails for pending offers expiring within the next 24 hours.
 * Marks each offer with reminder_sent_at to prevent duplicate sends.
 * Called by the daily cron job.
 */
export async function sendPendingReminders(): Promise<number> {
  const due = await sql<{
    id: string;
    user_id: string;
    spot_id: string;
    association_id: string;
    expires_at: string;
  }[]>`
    UPDATE spot_offers
    SET reminder_sent_at = now()
    WHERE status = 'pending'
      AND reminder_sent_at IS NULL
      AND expires_at BETWEEN now() AND now() + interval '24 hours'
    RETURNING id, user_id, spot_id, association_id, expires_at
  `;

  for (const offer of due) {
    const [user] = await sql<{ email: string }[]>`
      SELECT email FROM users WHERE id = ${offer.user_id}
    `;
    const [spot] = await sql<{ identifier: string }[]>`
      SELECT identifier FROM spots WHERE id = ${offer.spot_id}
    `;
    const [assoc] = await sql<{ name: string }[]>`
      SELECT name FROM associations WHERE id = ${offer.association_id}
    `;

    sendOfferReminderEmail({
      to: user.email,
      associationName: assoc?.name ?? "din förening",
      spotIdentifier: spot.identifier,
      expiresAt: new Date(offer.expires_at),
    }).catch((err) => {
      console.error("Failed to send offer reminder email:", err);
    });
  }

  return due.length;
}
