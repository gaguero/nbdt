import { query } from '../db';

/**
 * Auto-link an email thread to a guest record based on sender email.
 * Called during sync when a new inbound message is processed.
 */
export async function autoLinkGuest(
  fromEmail: string,
  threadId: number,
  client?: { query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }
): Promise<void> {
  const db = client || { query: (text: string, params?: unknown[]) => query(text, params) };

  // Check if thread already has a guest linked
  const thread = await db.query(
    'SELECT guest_id FROM email_threads WHERE id = $1',
    [threadId]
  );
  if (thread.rows[0]?.guest_id) return;

  // Search guests by email
  const guest = await db.query(
    'SELECT id FROM guests WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [fromEmail]
  );

  if (guest.rows.length > 0) {
    await db.query(
      'UPDATE email_threads SET guest_id = $1, updated_at = NOW() WHERE id = $2',
      [guest.rows[0].id, threadId]
    );
  }

  // Also check reservations for active stay
  const reservation = await db.query(
    `SELECT id FROM reservations
     WHERE LOWER(guest_email) = LOWER($1)
       AND status IN ('confirmed', 'checked_in', 'in_house')
     ORDER BY check_in_date DESC LIMIT 1`,
    [fromEmail]
  );

  if (reservation.rows.length > 0) {
    await db.query(
      'UPDATE email_threads SET reservation_id = $1, updated_at = NOW() WHERE id = $2',
      [reservation.rows[0].id, threadId]
    );
  }
}

/**
 * Manually link a thread to a guest.
 */
export async function linkThreadToGuest(
  threadId: number,
  guestId: number | null,
  reservationId: number | null
): Promise<void> {
  await query(
    `UPDATE email_threads SET guest_id = $1, reservation_id = $2, updated_at = NOW() WHERE id = $3`,
    [guestId, reservationId, threadId]
  );
}

/**
 * Search guests for manual linking.
 */
export async function searchGuestsForLinking(searchTerm: string): Promise<Array<{
  id: number;
  name: string;
  email: string;
  room_number: string | null;
}>> {
  const result = await query(
    `SELECT g.id, g.first_name || ' ' || g.last_name as name, g.email, r.room_number
     FROM guests g
     LEFT JOIN reservations r ON r.guest_id = g.id AND r.status IN ('confirmed', 'checked_in', 'in_house')
     WHERE g.first_name ILIKE $1 OR g.last_name ILIKE $1 OR g.email ILIKE $1
        OR r.room_number ILIKE $1 OR r.confirmation_number ILIKE $1
     ORDER BY g.last_name, g.first_name
     LIMIT 20`,
    [`%${searchTerm}%`]
  );
  return result.rows as Array<{ id: number; name: string; email: string; room_number: string | null }>;
}
