import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';
import { revokeAccess } from '@/lib/email/gmail-auth';

// GET /api/email/accounts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await query(
      `SELECT id, email_address, display_name, department,
              sync_status, sync_error, last_sync_at, watch_expiration,
              auto_assign_default_user_id, is_active, created_at, updated_at,
              last_history_id
       FROM email_accounts WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/email/accounts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (body.display_name !== undefined) {
      updates.push(`display_name = $${paramIdx++}`);
      values.push(body.display_name);
    }
    if (body.department !== undefined) {
      updates.push(`department = $${paramIdx++}`);
      values.push(body.department);
    }
    if (body.auto_assign_default_user_id !== undefined) {
      updates.push(`auto_assign_default_user_id = $${paramIdx++}`);
      values.push(body.auto_assign_default_user_id);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      values.push(body.is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE email_accounts SET ${updates.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, email_address, display_name, department, sync_status, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/email/accounts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    // Revoke OAuth access first
    try {
      await revokeAccess(parseInt(id));
    } catch {
      // Continue even if revoke fails
    }

    const result = await query(
      'DELETE FROM email_accounts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete account';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
