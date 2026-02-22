import { NextRequest, NextResponse } from 'next/server';
import { queryOne, queryMany } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

function formatTime(t: string | null): string | null {
  if (!t) return null;
  try {
    // t can be "HH:MM:SS" or "HH:MM" from SQL TIME columns
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return t;
  }
}

function formatEventTime(ts: string | Date | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    verifyToken(token);

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const [
      occupiedByCategory,
      totalByCategory,
      arrivalsData,
      departuresData,
      requestsData,
      unreadByStatus,
      activeOrders,
      dinnersToday,
      transfersToday,
      toursToday,
      pendingBills,
      recentActivity,
      comingUpToday,
      propertyTotalUnits,
    ] = await Promise.all([
      // Q1: Occupied rooms by category
      queryMany(
        `SELECT room_category, COUNT(DISTINCT room) as count
         FROM reservations
         WHERE arrival <= $1 AND departure > $1 AND status = 'CHECKED IN'
         GROUP BY room_category`,
        [date]
      ),

      // Q2: Total known rooms by category
      queryMany(
        `SELECT room_category, COUNT(DISTINCT room) as count
         FROM reservations
         WHERE room IS NOT NULL AND room_category IS NOT NULL
         GROUP BY room_category`,
        [date]
      ),

      // Q3: Arrivals + next guest
      queryMany(
        `SELECT r.id, g.full_name as guest_name, t.time as transfer_time
         FROM reservations r
         LEFT JOIN guests g ON r.guest_id = g.id
         LEFT JOIN transfers t ON t.reservation_id = r.id
           AND t.transfer_type = 'arrival' AND t.date = $1
           AND t.guest_status != 'cancelled'
         WHERE r.arrival = $1 AND r.status != 'CANCELLED'
         ORDER BY t.time ASC NULLS LAST`,
        [date]
      ),

      // Q4: Departures with billing
      queryMany(
        `SELECT r.id,
           CASE WHEN EXISTS (
             SELECT 1 FROM transfers t
             WHERE t.reservation_id = r.id AND t.billed_date IS NOT NULL
           ) THEN true ELSE false END as is_billed
         FROM reservations r
         WHERE r.departure = $1 AND r.status != 'CANCELLED'`,
        [date]
      ),

      // Q5: Open requests with priority (graceful fallback if priority column missing)
      (async () => {
        try {
          return await queryOne(
            `SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE priority = 'high') as high_priority
             FROM special_requests
             WHERE status = 'pending'`
          );
        } catch {
          const result = await queryOne(
            `SELECT COUNT(*) as total FROM special_requests WHERE status = 'pending'`
          );
          return { total: result.total, high_priority: '0' };
        }
      })(),

      // Q6: Unread messages by conversation status
      queryMany(
        `SELECT c.status, COUNT(m.id) as unread_count
         FROM conversations c
         JOIN messages m ON m.conversation_id = c.id
         WHERE c.status IN ('open', 'assigned')
           AND m.sender_type = 'guest'
           AND m.read_at IS NULL
         GROUP BY c.status`
      ),

      // Q7: Active orders
      queryOne(
        `SELECT COUNT(*) as count FROM orders
         WHERE status IN ('pending', 'confirmed', 'preparing')`
      ),

      // Q8: Dinners today
      queryOne(
        `SELECT COUNT(*) as count FROM romantic_dinners
         WHERE date = $1 AND status != 'cancelled'`,
        [date]
      ),

      // Q9: Transfers today
      queryOne(
        `SELECT COUNT(*) as count FROM transfers
         WHERE date = $1 AND guest_status != 'cancelled'`,
        [date]
      ),

      // Q10: Tours today
      queryOne(
        `SELECT COUNT(*) as count FROM tour_bookings tb
         LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
         WHERE COALESCE(ts.date, tb.activity_date) = $1
           AND tb.guest_status != 'cancelled'`,
        [date]
      ),

      // Q11: Pending bills (completed but unbilled)
      queryOne(
        `SELECT
           (SELECT COUNT(*) FROM transfers WHERE guest_status = 'completed' AND billed_date IS NULL) +
           (SELECT COUNT(*) FROM romantic_dinners WHERE status = 'completed' AND billed_date IS NULL) +
           (SELECT COUNT(*) FROM tour_bookings WHERE guest_status = 'completed' AND billed_date IS NULL)
         AS count`
      ),

      // Q12: Recent activity (last 24h)
      queryMany(
        `(
           SELECT 'message' as type, COALESCE(g.full_name, 'Guest') as title,
             LEFT(m.body, 80) as description,
             'Communications · WhatsApp' as meta, m.created_at as event_time
           FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           LEFT JOIN guests g ON c.guest_id = g.id
           WHERE m.sender_type = 'guest' AND m.created_at > NOW() - INTERVAL '24 hours'
           ORDER BY m.created_at DESC LIMIT 3
         )
         UNION ALL
         (
           SELECT 'order' as type,
             COALESCE(g.full_name, 'Guest') as title,
             'Order ' || o.order_number as description,
             'F&B · Orders' as meta, o.created_at as event_time
           FROM orders o
           LEFT JOIN guests g ON o.guest_id = g.id
           WHERE o.created_at > NOW() - INTERVAL '24 hours'
           ORDER BY o.created_at DESC LIMIT 2
         )
         UNION ALL
         (
           SELECT 'request' as type, COALESCE(g.full_name, 'Guest') as title,
             LEFT(sr.request, 80) as description,
             'Concierge · Requests' as meta, sr.created_at as event_time
           FROM special_requests sr
           LEFT JOIN guests g ON sr.guest_id = g.id
           WHERE sr.created_at > NOW() - INTERVAL '24 hours'
           ORDER BY sr.created_at DESC LIMIT 2
         )
         UNION ALL
         (
           SELECT 'checkin' as type, COALESCE(g.full_name, 'Guest') as title,
             'Checked in · ' || COALESCE(r.room, '') as description,
             'Concierge · Arrivals' as meta, r.updated_at as event_time
           FROM reservations r
           LEFT JOIN guests g ON r.guest_id = g.id
           WHERE r.status = 'CHECKED IN' AND r.arrival = $1
           ORDER BY r.updated_at DESC LIMIT 2
         )
         ORDER BY event_time DESC
         LIMIT 8`,
        [date]
      ),

      // Q13: Coming up today (results used below)
      queryMany(
        `(
           SELECT 'transfer' as type, COALESCE(g.full_name, 'Guest') as title,
             t.transfer_type || ' — ' || COALESCE(t.origin, '') || ' → ' || COALESCE(t.destination, '') as description,
             CASE t.transfer_type
               WHEN 'arrival' THEN 'Concierge · Transfer confirmed'
               WHEN 'departure' THEN 'Concierge · Departure'
               ELSE 'Concierge · Transfer'
             END as meta,
             t.time as event_time
           FROM transfers t
           LEFT JOIN guests g ON t.guest_id = g.id
           WHERE t.date = $1 AND t.guest_status != 'cancelled' AND t.time IS NOT NULL
         )
         UNION ALL
         (
           SELECT 'tour' as type, COALESCE(tp.name_en, 'Tour') as title,
             tb.num_guests || ' guests' as description,
             'Concierge · Tours' as meta,
             COALESCE(ts.start_time, tb.start_time) as event_time
           FROM tour_bookings tb
           LEFT JOIN tour_products tp ON tb.product_id = tp.id
           LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
           WHERE COALESCE(ts.date, tb.activity_date) = $1 AND tb.guest_status != 'cancelled'
         )
         UNION ALL
         (
           SELECT 'dinner' as type, COALESCE(g.full_name, 'Guest') as title,
             COALESCE(rd.location, 'Romantic dinner') as description,
             'F&B · Romantic Dinner' as meta,
             rd.time as event_time
           FROM romantic_dinners rd
           LEFT JOIN guests g ON rd.guest_id = g.id
           WHERE rd.date = $1 AND rd.status != 'cancelled'
         )
         ORDER BY event_time ASC NULLS LAST
         LIMIT 6`,
        [date]
      ),

      // Q14: Total units from property config
      queryOne(
        `SELECT settings->'rooms'->>'totalUnits' AS total_units
         FROM property_config
         LIMIT 1`
      ).catch(() => ({ total_units: null })),
    ]);

    // Build occupancy data
    const totalMap = new Map<string, number>();
    for (const row of totalByCategory) {
      if (row.room_category) totalMap.set(row.room_category, parseInt(row.count));
    }
    const occupiedMap = new Map<string, number>();
    for (const row of occupiedByCategory) {
      if (row.room_category) occupiedMap.set(row.room_category, parseInt(row.count));
    }

    const allCategories = [...new Set([...totalMap.keys(), ...occupiedMap.keys()])].sort();
    const byCategory = allCategories.map(label => ({
      label,
      occupied: occupiedMap.get(label) || 0,
      total: totalMap.get(label) || 0,
    }));

    const configTotalUnits = parseInt(propertyTotalUnits?.total_units || '0') || 0;
    const categoryTotal = byCategory.reduce((sum, c) => sum + c.total, 0);
    const totalRooms = configTotalUnits > 0 ? configTotalUnits : (categoryTotal > 0 ? categoryTotal : 37);
    const occupiedRooms = byCategory.reduce((sum, c) => sum + c.occupied, 0);
    const percentage = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // Arrivals
    const arrivalsCount = arrivalsData.length;
    const nextArrival = arrivalsData.find((a: any) => a.transfer_time);
    const nextGuest = nextArrival?.guest_name || (arrivalsData[0]?.guest_name || null);
    const nextTime = formatTime(nextArrival?.transfer_time || null);

    // Departures
    const departuresCount = departuresData.length;
    const billedCount = departuresData.filter((d: any) => d.is_billed).length;

    // Unread messages
    const assignedUnread = parseInt(
      unreadByStatus.find((r: any) => r.status === 'assigned')?.unread_count || '0'
    );
    const openUnread = parseInt(
      unreadByStatus.find((r: any) => r.status === 'open')?.unread_count || '0'
    );
    const totalUnread = assignedUnread + openUnread;

    // Open requests
    const requestsCount = parseInt(requestsData.total);
    const highPriority = parseInt(requestsData.high_priority || '0');

    // Format recent activity times
    const formattedActivity = recentActivity.map((item: any) => ({
      type: item.type,
      title: item.title || '',
      description: item.description || '',
      meta: item.meta || '',
      time: formatEventTime(item.event_time),
    }));

    // Format coming up today times
    const formattedComingUp = comingUpToday.map((item: any) => ({
      type: item.type,
      title: item.title || '',
      description: item.description || '',
      meta: item.meta || '',
      time: formatTime(item.event_time?.toString() || null) || '',
    }));

    return NextResponse.json({
      occupancy: {
        total: totalRooms,
        occupied: occupiedRooms,
        percentage,
        arriving: arrivalsCount,
        departing: departuresCount,
        byCategory,
      },
      arrivals: {
        count: arrivalsCount,
        nextGuest,
        nextTime,
      },
      departures: {
        count: departuresCount,
        billed: billedCount,
        pending: departuresCount - billedCount,
      },
      openRequests: {
        count: requestsCount,
        highPriority,
      },
      unreadMessages: {
        total: totalUnread,
        assigned: assignedUnread,
        open: openUnread,
      },
      modules: {
        arrivals: arrivalsCount,
        transfers: parseInt(transfersToday.count),
        tours: parseInt(toursToday.count),
        orders: parseInt(activeOrders.count),
        dinners: parseInt(dinnersToday.count),
        unread: totalUnread,
        requests: requestsCount,
        pendingBills: parseInt(pendingBills.count),
      },
      recentActivity: formattedActivity,
      comingUpToday: formattedComingUp,
    });
  } catch (error: any) {
    console.error('Dashboard pulse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
