import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';

// GET /api/email/accounts - List all email accounts
export async function GET(request: NextRequest) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const result = await query(
      `SELECT id, email_address, display_name, department,
              sync_status, sync_error, last_sync_at, watch_expiration,
              auto_assign_default_user_id, is_active, created_at, updated_at,
              (SELECT COUNT(*) FROM email_aliases WHERE account_id = ea.id AND is_active = true) as alias_count,
              (SELECT COUNT(*) FROM email_threads WHERE account_id = ea.id) as thread_count
       FROM email_accounts ea
       ORDER BY created_at DESC`
    );

    return NextResponse.json({ accounts: result.rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/email/accounts - Create a new email account (pre-OAuth)
export async function POST(request: NextRequest) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { display_name, department, email_address, auto_assign_default_user_id } = body;

    if (!display_name) {
      return NextResponse.json({ error: 'display_name is required' }, { status: 400 });
    }

    // email_address is optional at creation - will be confirmed via OAuth
    const result = await query(
      `INSERT INTO email_accounts (email_address, display_name, department, auto_assign_default_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email_address, display_name, department, sync_status, is_active, created_at`,
      [
        email_address || `pending-${Date.now()}@placeholder`,
        display_name,
        department || null,
        auto_assign_default_user_id || null,
        authResult.userId,
      ]
    );

    return NextResponse.json({ account: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create account';
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
