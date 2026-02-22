import { query } from '../db';

export interface ContactContext {
  contact: {
    email: string;
    name: string | null;
    type: 'guest' | 'vendor' | 'staff' | 'external';
  };
  guest: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    notes: string | null;
    vip: boolean;
  } | null;
  reservation: {
    id: number;
    opera_resv_id: string | null;
    status: string;
    room: string | null;
    arrival: string;
    departure: string;
    nights: number | null;
    persons: number | null;
    room_category: string | null;
    rate_code: string | null;
    group_name: string | null;
  } | null;
  pastReservations: Array<{
    id: number;
    status: string;
    room: string | null;
    arrival: string;
    departure: string;
  }>;
  transfers: Array<{
    id: number;
    transfer_date: string;
    time: string;
    origin: string;
    destination: string;
    status: string;
    pax: number;
    vendor_name: string | null;
  }>;
  tours: Array<{
    id: number;
    activity_name: string;
    tour_date: string;
    start_time: string | null;
    status: string;
    num_guests: number;
    vendor_name: string | null;
  }>;
  specialRequests: Array<{
    id: number;
    request: string;
    department: string | null;
    status: string;
    created_at: string;
  }>;
  emailHistory: Array<{
    thread_id: number;
    subject: string | null;
    last_message_at: string | null;
    status: string;
    message_count: number;
  }>;
  stats: {
    totalEmails: number;
    totalStays: number;
    totalTours: number;
    totalTransfers: number;
  };
}

/**
 * Build a rich context profile for a contact based on email thread data.
 * Extracts the primary external contact from the thread and gathers all
 * associated guest records, reservations, transfers, tours, requests, and
 * past email history.
 */
export async function getThreadContactContext(threadId: number): Promise<ContactContext | null> {
  // 1. Get thread info including guest link and messages
  const threadResult = await query(
    `SELECT et.*, ea.email_address as account_email,
            g.id as linked_guest_id
     FROM email_threads et
     JOIN email_accounts ea ON ea.id = et.account_id
     LEFT JOIN guests g ON g.id = et.guest_id
     WHERE et.id = $1`,
    [threadId]
  );

  if (threadResult.rows.length === 0) return null;
  const thread = threadResult.rows[0];

  // 2. Determine primary external contact email
  const messagesResult = await query(
    `SELECT from_address, from_name, to_addresses, direction
     FROM email_messages
     WHERE thread_id = $1
     ORDER BY gmail_internal_date ASC`,
    [threadId]
  );

  const messages = messagesResult.rows;
  const accountEmail = thread.account_email?.toLowerCase();

  // Find the primary external contact (first inbound sender, or first outbound recipient)
  let contactEmail: string | null = null;
  let contactName: string | null = null;

  for (const msg of messages) {
    if (msg.direction === 'inbound' && msg.from_address?.toLowerCase() !== accountEmail) {
      contactEmail = msg.from_address;
      contactName = msg.from_name;
      break;
    }
  }

  // Fallback to outbound recipient
  if (!contactEmail) {
    for (const msg of messages) {
      if (msg.direction === 'outbound' && msg.to_addresses) {
        const toAddrs = typeof msg.to_addresses === 'string'
          ? JSON.parse(msg.to_addresses)
          : msg.to_addresses;
        if (Array.isArray(toAddrs) && toAddrs.length > 0) {
          const first = toAddrs[0];
          if (first.email?.toLowerCase() !== accountEmail) {
            contactEmail = first.email;
            contactName = first.name || null;
            break;
          }
        }
      }
    }
  }

  if (!contactEmail) return null;

  // 3. Determine contact type
  let contactType: 'guest' | 'vendor' | 'staff' | 'external' = 'external';

  // Check if staff
  const staffCheck = await query(
    'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [contactEmail]
  );
  if (staffCheck.rows.length > 0) contactType = 'staff';

  // Check if vendor
  const vendorCheck = await query(
    'SELECT id FROM vendors WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [contactEmail]
  );
  if (vendorCheck.rows.length > 0) contactType = 'vendor';

  // 4. Find guest record
  let guest: ContactContext['guest'] = null;
  let guestId: number | null = thread.linked_guest_id || null;

  if (!guestId) {
    const guestSearch = await query(
      'SELECT id FROM guests WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [contactEmail]
    );
    if (guestSearch.rows.length > 0) {
      guestId = guestSearch.rows[0].id;
    }
  }

  if (guestId) {
    contactType = 'guest';
    const guestResult = await query(
      `SELECT id, first_name, last_name,
              COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') as full_name,
              email, phone, nationality, notes
       FROM guests WHERE id = $1`,
      [guestId]
    );
    if (guestResult.rows.length > 0) {
      const g = guestResult.rows[0];
      guest = {
        ...g,
        vip: false, // could be enhanced with VIP field
      };
    }
  }

  // 5. Find active reservation
  let reservation: ContactContext['reservation'] = null;
  if (guestId) {
    const resResult = await query(
      `SELECT id, opera_resv_id, status, room, arrival, departure,
              nights, persons, room_category, rate_code, group_name
       FROM reservations
       WHERE guest_id = $1
         AND status IN ('confirmed', 'checked_in', 'in_house', 'due_in')
       ORDER BY arrival DESC LIMIT 1`,
      [guestId]
    );
    if (resResult.rows.length > 0) {
      reservation = resResult.rows[0];
    }
  }

  // Also check by email if no guestId reservation found
  if (!reservation && contactEmail) {
    const resResult = await query(
      `SELECT r.id, r.opera_resv_id, r.status, r.room, r.arrival, r.departure,
              r.nights, r.persons, r.room_category, r.rate_code, r.group_name
       FROM reservations r
       JOIN guests g ON g.id = r.guest_id
       WHERE LOWER(g.email) = LOWER($1)
         AND r.status IN ('confirmed', 'checked_in', 'in_house', 'due_in')
       ORDER BY r.arrival DESC LIMIT 1`,
      [contactEmail]
    );
    if (resResult.rows.length > 0) {
      reservation = resResult.rows[0];
    }
  }

  // 6. Past reservations
  let pastReservations: ContactContext['pastReservations'] = [];
  if (guestId) {
    const pastRes = await query(
      `SELECT id, status, room, arrival, departure
       FROM reservations
       WHERE guest_id = $1
       ORDER BY departure DESC LIMIT 5`,
      [guestId]
    );
    pastReservations = pastRes.rows;
  }

  // 7. Upcoming transfers
  let transfers: ContactContext['transfers'] = [];
  if (guestId) {
    const trResult = await query(
      `SELECT t.id, t.transfer_date, t.time, t.origin, t.destination,
              t.status, t.pax, v.name as vendor_name
       FROM transfers t
       LEFT JOIN vendors v ON v.id = t.vendor_id
       WHERE t.guest_id = $1
       ORDER BY t.transfer_date DESC, t.time DESC
       LIMIT 5`,
      [guestId]
    );
    transfers = trResult.rows;
  }

  // 8. Tours
  let tours: ContactContext['tours'] = [];
  if (guestId) {
    const tourResult = await query(
      `SELECT tb.id, COALESCE(tp.name_en, tb.legacy_activity_name) as activity_name,
              tb.tour_date, tb.start_time, tb.guest_status as status,
              tb.num_guests, v.name as vendor_name
       FROM tour_bookings tb
       LEFT JOIN tour_products tp ON tp.id = tb.product_id
       LEFT JOIN vendors v ON v.id = tp.vendor_id
       WHERE tb.guest_id = $1
       ORDER BY tb.tour_date DESC, tb.start_time DESC
       LIMIT 5`,
      [guestId]
    );
    tours = tourResult.rows;
  }

  // 9. Special requests
  let specialRequests: ContactContext['specialRequests'] = [];
  if (guestId) {
    const srResult = await query(
      `SELECT id, request, department, status, created_at
       FROM special_requests
       WHERE guest_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [guestId]
    );
    specialRequests = srResult.rows;
  }

  // 10. Email history with this contact
  const emailHistoryResult = await query(
    `SELECT DISTINCT et.id as thread_id, et.subject, et.last_message_at,
            et.status, et.message_count
     FROM email_threads et
     JOIN email_messages em ON em.thread_id = et.id
     WHERE (em.from_address = $1 OR em.to_addresses::text ILIKE $2)
       AND et.id != $3
     ORDER BY et.last_message_at DESC
     LIMIT 10`,
    [contactEmail, `%${contactEmail}%`, threadId]
  );

  // 11. Stats
  const totalEmails = emailHistoryResult.rows.length + 1; // +1 for current
  const totalStays = pastReservations.length;
  const totalTours = tours.length;
  const totalTransfers = transfers.length;

  return {
    contact: {
      email: contactEmail,
      name: contactName || guest?.full_name || null,
      type: contactType,
    },
    guest,
    reservation,
    pastReservations,
    transfers,
    tours,
    specialRequests,
    emailHistory: emailHistoryResult.rows,
    stats: {
      totalEmails,
      totalStays,
      totalTours,
      totalTransfers,
    },
  };
}
