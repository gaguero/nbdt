import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from '@/lib/auth-guards';
import { query } from '@/lib/db';

// PATCH /api/email/aliases/[id]
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
    if (body.assigned_user_id !== undefined) {
      updates.push(`assigned_user_id = $${paramIdx++}`);
      values.push(body.assigned_user_id);
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
      `UPDATE email_aliases SET ${updates.join(', ')} WHERE id = $${paramIdx}
       RETURNING id, alias_address, display_name, account_id, assigned_user_id, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 });
    }

    return NextResponse.json({ alias: result.rows[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update alias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/email/aliases/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await protectRoute(request, 'settings:manage');
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const result = await query(
      'DELETE FROM email_aliases WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Alias not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete alias';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
