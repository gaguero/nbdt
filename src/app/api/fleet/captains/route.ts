import { NextRequest, NextResponse } from 'next/server';
import { queryMany, queryOne, query } from '@/lib/db';
import { protectRoute } from '@/lib/auth-guards';

export async function GET(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'transfers:read');
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const available_date = searchParams.get('available_date');

    let captains;
    try {
      captains = await queryMany(
        `SELECT su.id, su.first_name, su.last_name, su.email, su.role, su.is_active,
                COALESCE(
                  (SELECT json_agg(json_build_object('skill', cs.skill, 'certified_at', cs.certified_at, 'expires_at', cs.expires_at))
                   FROM captain_skills cs WHERE cs.staff_id = su.id),
                  '[]'
                ) as skills,
                COALESCE((SELECT COUNT(*) FROM fleet_assignments fa
                 WHERE fa.captain_id = su.id AND fa.date = CURRENT_DATE AND fa.status != 'cancelled'), 0) as today_assignments,
                COALESCE((SELECT COUNT(*) FROM fleet_assignments fa
                 WHERE fa.captain_id = su.id AND fa.date >= date_trunc('month', CURRENT_DATE)
                 AND fa.date < date_trunc('month', CURRENT_DATE) + interval '1 month'
                 AND fa.status = 'completed'), 0) as month_completed_trips
         FROM staff_users su
         WHERE su.role IN ('captain', 'logistics') AND su.is_active = true
         ORDER BY su.first_name`,
        []
      );
    } catch {
      // Fallback if fleet tables don't exist yet
      captains = await queryMany(
        `SELECT su.id, su.first_name, su.last_name, su.email, su.role, su.is_active,
                '[]'::json as skills, 0 as today_assignments, 0 as month_completed_trips
         FROM staff_users su
         WHERE su.role IN ('captain', 'logistics') AND su.is_active = true
         ORDER BY su.first_name`,
        []
      );
    }

    // If a date filter is provided, check time-off and schedules
    if (available_date) {
      const dayOfWeek = new Date(available_date + 'T12:00:00').getDay();

      for (const captain of captains as any[]) {
        // Check time-off
        const timeOff = await queryOne(
          `SELECT id FROM captain_time_off
           WHERE staff_id = $1 AND date_from <= $2 AND date_to >= $2 AND status = 'approved'`,
          [captain.id, available_date]
        );
        captain.on_time_off = !!timeOff;

        // Check schedule
        const schedule = await queryOne(
          `SELECT start_time, end_time, is_available FROM captain_schedules
           WHERE staff_id = $1 AND day_of_week = $2`,
          [captain.id, dayOfWeek]
        );
        captain.schedule = schedule || null;

        // Get assignments for that date
        const assignments = await queryMany(
          `SELECT fa.start_time, fa.end_time, fa.assignment_type, fa.status,
                  b.name as boat_name
           FROM fleet_assignments fa
           LEFT JOIN boats b ON fa.boat_id = b.id
           WHERE fa.captain_id = $1 AND fa.date = $2 AND fa.status != 'cancelled'
           ORDER BY fa.start_time`,
          [captain.id, available_date]
        );
        captain.date_assignments = assignments;
      }
    }

    return NextResponse.json({ captains });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await protectRoute(request, 'staff:manage');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { staff_id, action } = body;

    if (action === 'add_skill') {
      // Check if skill already exists, update if so, insert if not
      const existing = await queryOne(
        `SELECT id FROM captain_skills WHERE staff_id = $1 AND skill = $2`,
        [staff_id, body.skill]
      );

      let skill;
      if (existing) {
        skill = await queryOne(
          `UPDATE captain_skills SET certified_at = $1, expires_at = $2, notes = $3 WHERE staff_id = $4 AND skill = $5 RETURNING *`,
          [body.certified_at || null, body.expires_at || null, body.notes || null, staff_id, body.skill]
        );
      } else {
        skill = await queryOne(
          `INSERT INTO captain_skills (staff_id, skill, certified_at, expires_at, notes)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [staff_id, body.skill, body.certified_at || null, body.expires_at || null, body.notes || null]
        );
      }
      return NextResponse.json({ skill }, { status: 201 });
    }

    if (action === 'remove_skill') {
      await query('DELETE FROM captain_skills WHERE staff_id = $1 AND skill = $2', [staff_id, body.skill]);
      return NextResponse.json({ ok: true });
    }

    if (action === 'set_schedule') {
      // Upsert schedule for a day
      await query('DELETE FROM captain_schedules WHERE staff_id = $1 AND day_of_week = $2', [staff_id, body.day_of_week]);
      if (body.is_available !== false) {
        const schedule = await queryOne(
          `INSERT INTO captain_schedules (staff_id, day_of_week, start_time, end_time, is_available)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [staff_id, body.day_of_week, body.start_time || '06:00', body.end_time || '18:00', body.is_available !== false]
        );
        return NextResponse.json({ schedule }, { status: 201 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'request_time_off') {
      const timeOff = await queryOne(
        `INSERT INTO captain_time_off (staff_id, date_from, date_to, reason, status)
         VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
        [staff_id, body.date_from, body.date_to, body.reason || null]
      );
      return NextResponse.json({ time_off: timeOff }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
