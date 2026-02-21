import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';

// GET /api/email/accounts/[id]/aliases
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await query(
      `SELECT ea.id, ea.alias_address, ea.display_name, ea.account_id,
              ea.assigned_user_id, ea.is_active, ea.created_at, ea.updated_at,
              su.first_name || ' ' || su.last_name as assigned_user_name
       FROM email_aliases ea
       LEFT JOIN staff_users su ON su.id = ea.assigned_user_id
       WHERE ea.account_id = $1
       ORDER BY ea.alias_address ASC`,
      [id]
    );

    return NextResponse.json({ aliases: result.rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch aliases';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/email/accounts/[id]/aliases
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    const { alias_address, display_name, assigned_user_id } = body;

    if (!alias_address) {
      return NextResponse.json({ error: 'alias_address is required' }, { status: 400 });
    }

    // Verify account exists
    const account = await query('SELECT id FROM email_accounts WHERE id = $1', [id]);
    if (account.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO email_aliases (alias_address, display_name, account_id, assigned_user_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, alias_address, display_name, account_id, assigned_user_id, is_active, created_at`,
      [alias_address, display_name || null, id, assigned_user_id || null, authResult.userId]
    );

    return NextResponse.json({ alias: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create alias';
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json({ error: 'This alias address already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
